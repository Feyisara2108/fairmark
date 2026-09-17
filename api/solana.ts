import type { VercelRequest, VercelResponse } from "@vercel/node";

// Thin JSON-RPC pass-through to a Solana RPC. The frontend POSTs a standard
// JSON-RPC body (a getTokenSupply batch) and we forward it verbatim, keeping the
// call same-origin (CORS) and letting the RPC endpoint be swapped via env.
// Defaults to the public mainnet-beta RPC; set SOLANA_RPC_URL to a dedicated
// provider for production reliability.
// Use || (not ??) so a declared-but-empty env var falls back too: Vercel
// injects an unset-with-no-value variable as "", which ?? would keep, breaking
// fetch with "Failed to parse URL". Mirrors the dev proxy in vite.config.ts.
const RPC =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const upstream = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Solana RPC returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json();
    // On-chain supply changes rarely; cache briefly at the edge.
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({
      error: "Failed to reach Solana RPC",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
