// Shapes returned by the upstream provider APIs (via our /api proxies).
// Verified against live responses on 2026-09-16.

export interface PreStockToken {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  contract_address: string; // the SPL mint address on Solana
  markPrice: number; // fair value implied by the underlying company valuation
  markValuation: number;
  tokenPrice: number; // actual current on-chain trading price
  impliedValuation: number;
  supply: number;
}

export interface TesseraToken {
  id: string;
  name: string;
  symbol: string;
  code: string;
  sector: string;
  mint: string;
  markPrice: number; // Tessera exposes fair value only — no trading price
  holders: number;
  markValuation: number;
}

// A PreStock enriched with its computed deviation, ready for display.
export interface RankedPreStock extends PreStockToken {
  deviationPercent: number; // (tokenPrice - markPrice) / markPrice * 100
  tradeUrl: string; // Jupiter swap deep link
}

// Feature B — the single headline stat shown first on the page.
export interface MispricingSummary {
  totalMispricingUsd: number; // sum of |markValuation - impliedValuation|
  netMispricingUsd: number; // signed sum (discounts positive, premiums negative)
  tokenCount: number;
  discountCount: number;
  premiumCount: number;
}

// Feature A — one company tokenized by both issuers, shown side by side.
export interface CrossIssuerPair {
  companyKey: string; // normalized identity, e.g. "spacex"
  displayName: string; // e.g. "SpaceX"
  prestocks: RankedPreStock;
  tessera: TesseraToken;
  // How the two issuers' implied company valuations differ, PreStocks relative
  // to Tessera (valuation, not per-token price — denominations differ).
  markSpreadPercent: number;
}

// Feature C — a group of tokens shown as a blended index.
export interface Basket {
  id: string;
  name: string;
  description: string;
  members: RankedPreStock[];
  blendedMarkPrice: number; // equal-weight avg of member markPrice
  blendedTokenPrice: number; // equal-weight avg of member tokenPrice
  deviationPercent: number; // blended trading price vs blended fair value
}
