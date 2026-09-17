# FairMark

**Hundreds of billions of dollars of mispricing sit in the open across tokenized pre-IPO stocks. FairMark is the first place a buyer can see it — then trade in one tap.**

Platforms like PreStocks and Tessera issue tokens meant to track a private
company's real valuation (SpaceX, OpenAI, Anthropic, Neuralink, Anduril…). But
two gaps hide in their public APIs, and nothing today surfaces either to a buyer
before they trade:

### 1. The dollar-value mispricing headline

FairMark's first screen sums the gap between each PreStocks token's **fair
valuation** and its **implied (trading) valuation** across every live token, and
shows it as a single number — currently **hundreds of billions of dollars** of
mispricing, live, updating on its own.

### 2. Cross-issuer comparison — the same company, priced two ways

Some companies are tokenized by **both** PreStocks and Tessera, at different
implied valuations and different legal structures (PreStocks = SPV equity
exposure; Tessera = loan-participation right). FairMark shows them **side by
side** — e.g. SpaceX, OpenAI, and Kalshi each carry a materially different
implied company valuation depending on the issuer. This is the hardest-to-
replicate view in the product.

> **Example (live from the PreStocks API):**
> SpaceX shows a fair value of ~**$151** while its token trades ~**19% below** it —
> and PreStocks implies a very different SpaceX company valuation than Tessera does.

### 3. On-chain verification

Every token FairMark lists is checked against its **SPL mint on Solana** — the
live supply is read directly from the chain and surfaced as a "verified
on-chain ✓" badge on each token (and a count in the header). It's proof the
listings are real on-chain assets, not just rows from an issuer API. Best-effort
and non-blocking: if the RPC is unavailable the badge is simply omitted.

FairMark surfaces both gaps, flags them clearly, groups related tokens into
blended baskets, and links straight out to [Jupiter](https://jup.ag) to trade —
no wallet connection, no custody, no trading logic of our own.

## How it works

Per-token deviation:

```
deviation_percent = ((tokenPrice - markPrice) / markPrice) * 100
```

- **Positive → premium** (token trades above fair value; buyers risk overpaying)
- **Negative → discount** (token trades below fair value; a potential deal)

The dollar headline sums `|markValuation - impliedValuation|` across all
PreStocks tokens. The cross-issuer spread compares each issuer's **implied
company valuation** (not per-token price — the two issuers denominate tokens
differently, so raw prices aren't directly comparable). Baskets are
equal-weight blends of related tokens. Data auto-refreshes client-side every
45 seconds with a live sparkline per token.

PreStocks tokens carry both a fair value and a trading price. Tessera's public
API exposes fair value only (no on-chain trading price), so Tessera tokens are
used for cross-issuer valuation context rather than per-token deviation.

## Features

- **Live dollar-mispricing headline** across all PreStocks tokens
- **Cross-issuer comparison** for companies on both PreStocks and Tessera, with a
  **Pyth oracle** third reference where one exists (OpenAI)
- **PreStocks spotlight** — the single biggest discount, surfaced as a concrete
  "best deal right now" call to action
- **Blended baskets** (e.g. AI Pre-IPO: OpenAI · Anthropic · Neuralink · Figure AI)
- **Ranked token list** sorted by biggest fair-value gap, with live sparklines,
  float/supply, expandable SPV-structure detail, and links back to PreStocks
- **On-chain verification** — live SPL supply read from Solana per token, shown
  as a "verified on-chain ✓" badge
- **One-tap "Trade on Jupiter"** deep link per token (routes verified live)

## Data sources

| Source | Endpoint | Fields used |
| --- | --- | --- |
| PreStocks | `GET https://prestocks.com/api/prestocks` | `markPrice`, `tokenPrice`, valuations, `supply`, `description`, `external_url`, `contract_address` |
| Tessera | `GET https://rest-api.tessera.pe/v1/public/token-details` | `markPrice`, `holders`, `markValuation`, `mint` |
| Pyth | Hermes `v2/updates/price/latest` (`Pyth.Index.OPENAI/USD`, `Crypto.SOL/USD`) | independent oracle reference prices |
| Solana | JSON-RPC `getTokenSupply` (public mainnet-beta by default) | live on-chain SPL supply for the "verified on-chain" badge |
| Jupiter | `https://jup.ag/swap/<SOL>-<mint>` | trade deep link |

Provider APIs are called through serverless proxies in [`api/`](./api) to avoid
browser CORS restrictions.

### Pyth activation

Hermes' price endpoint is auth-gated (Pyth Pro): it needs an access token from
an authorized Pyth Data Distributor. Set **`PYTH_TOKEN`** in the Vercel
environment to activate — the app then shows a live SOL price and, for OpenAI
(the one pre-IPO name Pyth carries a feed for), an independent oracle valuation
alongside the PreStocks and Tessera marks. Without the token, `/api/pyth`
returns `{ available: false }` and all Pyth UI is simply omitted; everything
else works unchanged. Optional override: `PYTH_HERMES_URL`.

### Solana RPC (on-chain verification)

The "verified on-chain" badges read live SPL supply via `/api/solana`. By default
this uses the public `api.mainnet-beta.solana.com` RPC, which is rate-limited and
can be unreliable under load. For a dependable demo, set **`SOLANA_RPC_URL`** to a
dedicated provider (Helius / Alchemy / QuickNode free tiers all work) — read by
both `vite dev` and the Vercel function. Copy `.env.example` to `.env` locally, or
set it in the Vercel environment. See [`.env.example`](./.env.example) for the URL
formats. Optional — the badges just degrade gracefully when the RPC is unavailable.

## Stack

- React + TypeScript + Tailwind CSS (Vite)
- Vercel serverless functions as a thin proxy layer
- No wallet, no auth, no on-chain program — all off-chain data + display

## Run locally

```bash
npm install
npm run dev
```

`vite dev` proxies `/api/*` straight to the upstream providers, so the app is
fully functional locally without running the serverless functions. In
production on Vercel, the functions in `api/` serve those routes.

## Deploy

Push to GitHub and import into Vercel. It auto-detects the Vite build and the
`api/` serverless functions; the free tier is sufficient. No environment
variables are required — the app runs on public endpoints out of the box.
For a more reliable demo, optionally set `SOLANA_RPC_URL` (on-chain badges) and
`PYTH_TOKEN` (oracle reference prices); both degrade gracefully when unset.

## Scope

**In:** discovery of the fair-value gap, sorted display, one-tap trade hand-off
to Jupiter.
**Out (by design):** wallet connection, in-app trading, custom Solana programs,
user auth. FairMark is a discovery + entry-point product, not a DEX.

_Not investment advice._
