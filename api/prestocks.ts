import type { VercelRequest, VercelResponse } from "@vercel/node";

// Proxies the public PreStocks token feed. Browser-side calls to prestocks.com
// are blocked by CORS, so the frontend hits this same-origin route instead.
const UPSTREAM = "https://prestocks.com/api/prestocks";

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
        .json({ error: `PreStocks upstream returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    // Cache at the edge for a minute; prices move but not every request needs a
    // fresh upstream hit, and this keeps us well under any rate limits.
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({
      error: "Failed to reach PreStocks",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
