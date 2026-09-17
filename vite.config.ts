import { Agent } from "node:https";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Force IPv4: some upstream hosts (e.g. rest-api.tessera.pe) advertise an AAAA
// record that black-holes, and Node's dev-proxy http agent hangs on it (ETIMEDOUT)
// where undici/curl fall back to IPv4. Production on Vercel uses global fetch, so
// this only matters for `vite dev`.
const ipv4Agent = new Agent({ family: 4, keepAlive: true });

// Dev-only stand-in for the /api/solana serverless function: forwards the
// frontend's JSON-RPC POST to the configured Solana RPC with a header-clean
// fetch (mirrors api/solana.ts). Using fetch rather than a target proxy means
// any provider URL works — including query-based keys (Helius) that a static
// proxy target can't carry — and browser Origin/Referer headers are dropped, so
// the public RPC (which 403s browser-originated calls) accepts them.
function solanaRpcDev(rpcUrl: string): Plugin {
  return {
    name: "solana-rpc-dev",
    configureServer(server) {
      server.middlewares.use("/api/solana", (req, res, next) => {
        if (req.method !== "POST") return next();
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(c as Buffer));
        req.on("end", async () => {
          try {
            const upstream = await fetch(rpcUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: Buffer.concat(chunks).toString("utf8"),
            });
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader("content-type", "application/json");
            res.end(text);
          } catch (err) {
            res.statusCode = 502;
            res.end(
              JSON.stringify({
                error: "Failed to reach Solana RPC",
                detail: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        });
      });
    },
  };
}

// During local `vite dev` the /api serverless functions aren't running, so we
// proxy /api calls straight to the upstream providers. In production on Vercel,
// the functions in /api handle these routes instead (see api/*.ts).
export default defineConfig(({ mode }) => {
  // Load .env* without the VITE_ prefix filter: SOLANA_RPC_URL is a server-side
  // endpoint (kept out of the client bundle), read only here in the dev server.
  const env = loadEnv(mode, process.cwd(), "");
  const solanaRpcUrl =
    env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

  return {
    plugins: [react(), tailwindcss(), solanaRpcDev(solanaRpcUrl)],
    server: {
      proxy: {
        "/api/prestocks": {
          target: "https://prestocks.com",
          changeOrigin: true,
          agent: ipv4Agent,
          rewrite: () => "/api/prestocks",
        },
        "/api/tessera": {
          target: "https://rest-api.tessera.pe",
          changeOrigin: true,
          agent: ipv4Agent,
          rewrite: () => "/v1/public/token-details",
        },
      },
    },
  };
});
