import type { VercelRequest, VercelResponse } from "@vercel/node";

// Proxies the public Tessera token-details feed for the same CORS reason as the
// PreStocks proxy. Tessera exposes markPrice/valuation/holders but no on-chain
// trading price, so the frontend shows these tokens as context, not deviation.
const UPSTREAM = "https://rest-api.tessera.pe/v1/public/token-details";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      headers: { accept: "application/json" },
    });

    if (!upstream.ok) {
      res
        .status(502)
        .json({ error: `Tessera upstream returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({
      error: "Failed to reach Tessera",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
