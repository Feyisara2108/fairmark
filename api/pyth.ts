import type { VercelRequest, VercelResponse } from "@vercel/node";

// Pyth Hermes price feeds we use. Hermes' price endpoint is auth-gated (Pyth
// Pro): it needs an access token from an authorized Pyth Data Distributor.
// Set PYTH_TOKEN in the Vercel environment to activate. Without it, this route
// returns { available: false } and the app hides all Pyth-derived UI — the rest
// of FairMark works unchanged.
//
// Feed IDs (verified via Hermes metadata, 2026-09-16):
const FEEDS = {
  // Crypto.SOL/USD — live settlement price for SOL-denominated Jupiter trades.
  sol: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  // Pyth.Index.OPENAI/USD — independent oracle valuation for OpenAI, the one
  // pre-IPO name in our set with a Pyth feed. Powers the three-way comparison.
  openai: "96d4bb23a3db78fdb72b3a03ce80ead686096f324319166534d9a27c0519c483",
} as const;

const HERMES = process.env.PYTH_HERMES_URL ?? "https://hermes.pyth.network";

interface HermesParsed {
  id: string;
  price: { price: string; conf: string; expo: number; publish_time: number };
}

type PriceOut = { price: number; conf: number; publishTime: number };

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const token = process.env.PYTH_TOKEN;
  if (!token) {
    res.status(200).json({ available: false, reason: "PYTH_TOKEN not set" });
    return;
  }

  const ids = Object.values(FEEDS)
    .map((id) => `ids[]=${id}`)
    .join("&");
  const url = `${HERMES}/v2/updates/price/latest?${ids}&parsed=true`;

  try {
    const upstream = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });

    if (!upstream.ok) {
      res.status(200).json({
        available: false,
        reason: `Hermes returned ${upstream.status}`,
      });
      return;
    }

    const body = (await upstream.json()) as { parsed?: HermesParsed[] };
    const byId = new Map((body.parsed ?? []).map((p) => [p.id.replace(/^0x/, ""), p]));

    const read = (id: string): PriceOut | null => {
      const p = byId.get(id);
      if (!p) return null;
      const scale = 10 ** p.price.expo;
      return {
        price: Number(p.price.price) * scale,
        conf: Number(p.price.conf) * scale,
        publishTime: p.price.publish_time,
      };
    };

    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=30");
    res.status(200).json({
      available: true,
      prices: { sol: read(FEEDS.sol), openai: read(FEEDS.openai) },
    });
  } catch (err) {
    res.status(200).json({
      available: false,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
