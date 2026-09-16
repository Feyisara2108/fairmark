import type {
  Basket,
  CrossIssuerPair,
  MispricingSummary,
  PreStockToken,
  RankedPreStock,
  TesseraToken,
} from "./types";

/**
 * Core metric: how far the actual on-chain trading price sits from the
 * platform's stated fair value.
 *   positive  → trading at a premium (buyer risks overpaying)
 *   negative  → trading at a discount (seller risks underselling)
 */
export function deviationPercent(markPrice: number, tokenPrice: number): number {
  if (!markPrice) return 0;
  return ((tokenPrice - markPrice) / markPrice) * 100;
}

// Wrapped SOL — used as the "pay with" side of the Jupiter swap link so the
// user lands on a ready-to-trade screen that buys the pre-IPO token with SOL.
const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Jupiter front-end deep link. Canonical format is
 *   https://jup.ag/swap/<INPUT>-<OUTPUT>
 * where each side accepts a mint address. We buy the token with SOL.
 * Isolated here so the URL scheme can be updated in exactly one place.
 */
export function jupiterTradeUrl(mint: string): string {
  return `https://jup.ag/swap/${SOL_MINT}-${mint}`;
}

/** Enrich + sort PreStocks by the size of their deviation (biggest first). */
export function rankPreStocks(tokens: PreStockToken[]): RankedPreStock[] {
  return tokens
    .map((t) => ({
      ...t,
      deviationPercent: deviationPercent(t.markPrice, t.tokenPrice),
      tradeUrl: jupiterTradeUrl(t.contract_address),
    }))
    .sort(
      (a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent),
    );
}

// --- Feature B: headline mispricing stat -----------------------------------

/**
 * Aggregate the dollar mispricing across all PreStocks tokens using the
 * existing markValuation (fair) and impliedValuation (trading) fields.
 * The headline number is the *total absolute* mispricing — premiums and
 * discounts don't cancel, because both represent real mispricing a buyer or
 * seller can be caught by. The signed net is kept for context.
 */
export function mispricingSummary(tokens: PreStockToken[]): MispricingSummary {
  let total = 0;
  let net = 0;
  let discountCount = 0;
  let premiumCount = 0;

  for (const t of tokens) {
    const gap = t.markValuation - t.impliedValuation; // + = trading below fair
    total += Math.abs(gap);
    net += gap;
    if (t.tokenPrice < t.markPrice) discountCount++;
    else if (t.tokenPrice > t.markPrice) premiumCount++;
  }

  return {
    totalMispricingUsd: total,
    netMispricingUsd: net,
    tokenCount: tokens.length,
    discountCount,
    premiumCount,
  };
}

// --- Feature A: cross-issuer comparison -------------------------------------

/**
 * Normalize a token to the underlying company it represents, so the same
 * company can be matched across issuers.
 *   PreStocks "SPACEX" / "SpaceX PreStocks"  → "spacex"
 *   Tessera   "tSpaceX" / "T-SpaceX"          → "spacex"
 */
export function companyKey(raw: string): string {
  return raw
    .replace(/\bprestocks\b/gi, "")
    .replace(/^t-/i, "")
    .replace(/^t(?=[A-Z])/, "") // leading "t" in camelCase codes like tSpaceX
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

/** Pretty display name for a matched company (prefers the PreStocks label). */
function displayName(prestocks: RankedPreStock): string {
  return prestocks.name.replace(/\s*PreStocks$/i, "").trim();
}

/**
 * Find companies tokenized by BOTH issuers and pair them up. `prestocks`
 * should already be ranked. Ordered by the size of the fair-value spread.
 */
export function crossIssuerPairs(
  prestocks: RankedPreStock[],
  tessera: TesseraToken[],
): CrossIssuerPair[] {
  const tesseraByKey = new Map<string, TesseraToken>();
  for (const t of tessera) {
    tesseraByKey.set(companyKey(t.code || t.symbol || t.name), t);
  }

  const pairs: CrossIssuerPair[] = [];
  for (const p of prestocks) {
    const key = companyKey(p.symbol || p.name);
    const match = tesseraByKey.get(key);
    if (!match) continue;
    pairs.push({
      companyKey: key,
      displayName: displayName(p),
      prestocks: p,
      tessera: match,
      // Compare on implied *company* valuation, not per-token price: the two
      // issuers denominate their tokens differently, so raw price spreads are
      // apples-to-oranges. Both markValuations claim to value the same company.
      markSpreadPercent: deviationPercent(match.markValuation, p.markValuation),
    });
  }

  return pairs.sort(
    (a, b) => Math.abs(b.markSpreadPercent) - Math.abs(a.markSpreadPercent),
  );
}

// --- Feature C: blended baskets ---------------------------------------------

// Baskets are defined by PreStocks symbol (only PreStocks tokens have a trading
// price, which is what makes a blended deviation meaningful).
const BASKET_DEFS: { id: string; name: string; description: string; symbols: string[] }[] =
  [
    {
      id: "ai",
      name: "AI Pre-IPO Basket",
      description: "OpenAI · Anthropic · Neuralink · Figure AI",
      symbols: ["OPENAI", "ANTHROPIC", "NEURALINK", "FIGUREAI"],
    },
    {
      id: "prediction",
      name: "Prediction Markets Basket",
      description: "Kalshi · Polymarket",
      symbols: ["KALSHI", "POLYMARKET"],
    },
  ];

/** Build equal-weight blended baskets from whatever members are available. */
export function buildBaskets(prestocks: RankedPreStock[]): Basket[] {
  const bySymbol = new Map(prestocks.map((t) => [t.symbol.toUpperCase(), t]));

  return BASKET_DEFS.map((def) => {
    const members = def.symbols
      .map((s) => bySymbol.get(s))
      .filter((t): t is RankedPreStock => Boolean(t));
    if (members.length === 0) return null;

    const avg = (sel: (t: RankedPreStock) => number) =>
      members.reduce((sum, t) => sum + sel(t), 0) / members.length;
    const blendedMarkPrice = avg((t) => t.markPrice);
    const blendedTokenPrice = avg((t) => t.tokenPrice);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      members,
      blendedMarkPrice,
      blendedTokenPrice,
      deviationPercent: deviationPercent(blendedMarkPrice, blendedTokenPrice),
    };
  }).filter((b): b is Basket => b !== null);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(detail || `Request to ${url} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function fetchPreStocks(): Promise<PreStockToken[]> {
  return fetchJson<PreStockToken[]>("/api/prestocks");
}

export function fetchTessera(): Promise<TesseraToken[]> {
  return fetchJson<TesseraToken[]>("/api/tessera");
}

// Display helpers -----------------------------------------------------------

export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Compact valuation, e.g. $1.98T, $133.1B, $14.0B. */
export function formatValuation(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  });
}

export function formatPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** Compact plain number, e.g. 43.7K tokens. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** The single most-discounted PreStocks token (biggest buy-below-fair-value). */
export function bestDiscount(tokens: RankedPreStock[]): RankedPreStock | null {
  const discounts = tokens.filter((t) => t.deviationPercent < 0);
  if (discounts.length === 0) return null;
  return discounts.reduce((a, b) =>
    b.deviationPercent < a.deviationPercent ? b : a,
  );
}
