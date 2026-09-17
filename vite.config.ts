import { Agent } from "node:https";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Force IPv4: some upstream hosts (e.g. rest-api.tessera.pe) advertise an AAAA
// record that black-holes, and Node's dev-proxy http agent hangs on it (ETIMEDOUT)
// where undici/curl fall back to IPv4. Production on Vercel uses global fetch, so
// this only matters for `vite dev`.
const ipv4Agent = new Agent({ family: 4, keepAlive: true });

// During local `vite dev` the /api serverless functions aren't running, so we
// proxy /api calls straight to the upstream providers. In production on Vercel,
// the functions in /api handle these routes instead (see api/*.ts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
      // JSON-RPC pass-through to Solana mainnet — the frontend POSTs a
      // getTokenSupply call; forward it to read on-chain supply. The public RPC
      // rejects browser-originated requests (403 on Origin/Referer), so strip
      // those headers to mirror the header-clean prod fetch in api/solana.ts.
      "/api/solana": {
        target: "https://api.mainnet-beta.solana.com",
        changeOrigin: true,
        agent: ipv4Agent,
        rewrite: () => "/",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
          });
        },
      },
    },
  },
});
