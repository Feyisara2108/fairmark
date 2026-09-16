import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Basket,
  CrossIssuerPair,
  MispricingSummary,
  RankedPreStock,
  TesseraToken,
} from "./lib/types";
import {
  bestDiscount,
  buildBaskets,
  crossIssuerPairs,
  fetchPreStocks,
  fetchTessera,
  formatUsd,
  mispricingSummary,
  rankPreStocks,
} from "./lib/fairmark";
import { fetchPyth, type PythSnapshot } from "./lib/pyth";
import { MispricingHeadline } from "./components/MispricingHeadline";
import { CrossIssuerCompare } from "./components/CrossIssuerCompare";
import { PreStocksSpotlight } from "./components/PreStocksSpotlight";
import { BasketCard } from "./components/BasketCard";
import { TokenCard } from "./components/TokenCard";
import { TesseraCard } from "./components/TesseraCard";

const REFRESH_MS = 45_000; // feature D: keep the page feeling live
const MAX_HISTORY = 20; // rolling trading-price points per token for the sparkline

export default function App() {
  const [preStocks, setPreStocks] = useState<RankedPreStock[] | null>(null);
  const [tessera, setTessera] = useState<TesseraToken[] | null>(null);
  const [summary, setSummary] = useState<MispricingSummary | null>(null);
  const [pyth, setPyth] = useState<PythSnapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // In-memory rolling history of trading prices, keyed by token symbol.
  const historyRef = useRef<Record<string, number[]>>({});
  const [historyTick, setHistoryTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const raw = await fetchPreStocks();
      const ranked = rankPreStocks(raw);

      // Append the latest trading price to each token's rolling history.
      const hist = historyRef.current;
      for (const t of ranked) {
        const arr = hist[t.symbol] ?? [];
        arr.push(t.tokenPrice);
        if (arr.length > MAX_HISTORY) arr.shift();
        hist[t.symbol] = arr;
      }

      setPreStocks(ranked);
      setSummary(mispricingSummary(raw));
      setUpdatedAt(new Date());
      setHistoryTick((n) => n + 1);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }

    // Pyth reference prices — optional; stays quiet (available:false) until a
    // Pyth Pro token is configured server-side. Never blocks the main data.
    fetchPyth().then(setPyth).catch(() => setPyth({ available: false }));
  }, []);

  useEffect(() => {
    load();
    // Tessera is supplementary and rarely changes — fetch once.
    fetchTessera()
      .then(setTessera)
      .catch(() => setTessera([]));

    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const pairs: CrossIssuerPair[] = useMemo(
    () => (preStocks && tessera ? crossIssuerPairs(preStocks, tessera) : []),
    [preStocks, tessera],
  );

  const baskets: Basket[] = useMemo(
    () => (preStocks ? buildBaskets(preStocks) : []),
    [preStocks],
  );

  // Companies already shown in the cross-issuer section — hide their Tessera
  // cards below to avoid duplication.
  const pairedTesseraMints = useMemo(
    () => new Set(pairs.map((p) => p.tessera.mint)),
    [pairs],
  );

  const spotlight = useMemo(
    () => (preStocks ? bestDiscount(preStocks) : null),
    [preStocks],
  );

  const pythOpenAiUsd = pyth?.available ? pyth.prices?.openai?.price : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <Masthead pyth={pyth} />

        {error && (
          <div className="mb-8 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            Couldn't load PreStocks data: {error}
          </div>
        )}

        {/* B — headline mispricing stat, first thing visible */}
        <MispricingHeadline summary={summary} updatedAt={updatedAt} />

        {/* A — cross-issuer comparison, the flagship view */}
        {pairs.length > 0 && (
          <section className="mb-14">
            <SectionHeading
              eyebrow="Cross-issuer"
              title="Same company, two issuers, two prices"
              subtitle="These companies are tokenized by both PreStocks and Tessera — at different marks and structures. Nowhere else shows them side by side."
            />
            <CrossIssuerCompare pairs={pairs} pythOpenAiUsd={pythOpenAiUsd} />
          </section>
        )}

        {/* C — blended baskets */}
        {baskets.length > 0 && (
          <section className="mb-14">
            <SectionHeading
              eyebrow="Baskets"
              title="Blended index view"
              subtitle="Equal-weight groups of related tokens: blended fair value vs blended trading price."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {baskets.map((b) => (
                <BasketCard key={b.id} basket={b} />
              ))}
            </div>
          </section>
        )}

        {/* PreStocks — the anchor integration: spotlight + full ranked list */}
        <section className="mb-14">
          <SectionHeading
            eyebrow="PreStocks · tokenized pre-IPO stocks"
            title="Every token, ranked by mispricing"
            subtitle="Backed 1:1 by SPV exposure. Sorted by biggest gap — a discount trades below fair value, a premium above. Each card links back to PreStocks and out to a live Jupiter trade."
          />
          {spotlight && (
            <div className="mb-5">
              <PreStocksSpotlight token={spotlight} />
            </div>
          )}
          {!preStocks && !error && <SkeletonGrid />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preStocks?.map((t) => (
              <TokenCard
                key={t.contract_address}
                token={t}
                history={
                  // historyTick in deps ensures re-render when history grows
                  historyTick >= 0 ? historyRef.current[t.symbol] : undefined
                }
              />
            ))}
          </div>
        </section>

        {/* Remaining Tessera tokens not already paired above */}
        <section className="mb-14">
          <SectionHeading
            eyebrow="Tessera"
            title="Other Tessera tokens"
            subtitle="Tessera's public API exposes fair value only (no on-chain trading price), so these are shown for context."
          />
          {!tessera && <SkeletonGrid count={3} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tessera
              ?.filter((t) => !pairedTesseraMints.has(t.mint))
              .map((t) => (
                <TesseraCard key={t.mint} token={t} />
              ))}
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}

function Masthead({ pyth }: { pyth: PythSnapshot | null }) {
  const sol = pyth?.available ? pyth.prices?.sol : null;
  return (
    <header className="mb-10">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live from PreStocks &amp; Tessera public APIs
        </div>
        {sol && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            SOL {formatUsd(sol.price)} · via Pyth
          </div>
        )}
      </div>
      <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
        Fair<span className="text-indigo-400">Mark</span>
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-400">
        Tokenized pre-IPO stocks often trade at a gap from their stated fair
        value — and the same company can be priced differently across issuers.
        FairMark surfaces the gap before you buy, then takes you to the trade.
      </p>
    </header>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-100">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40"
        />
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-900 pt-6 text-xs text-slate-600">
      <p>
        Tokens &amp; data by{" "}
        <a
          href="https://prestocks.com/products"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 underline hover:text-slate-200"
        >
          PreStocks
        </a>{" "}
        and{" "}
        <a
          href="https://app.tessera.pe"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 underline hover:text-slate-200"
        >
          Tessera
        </a>
        . Oracle reference prices by{" "}
        <a
          href="https://www.pyth.network"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 underline hover:text-slate-200"
        >
          Pyth Network
        </a>
        . Trades open on{" "}
        <a
          href="https://jup.ag"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 underline hover:text-slate-200"
        >
          Jupiter
        </a>
        . FairMark is a discovery tool — it never connects to your wallet or
        holds funds. Not investment advice.
      </p>
    </footer>
  );
}
