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
  formatPercent,
  mispricingSummary,
  rankPreStocks,
} from "./lib/fairmark";
import { fetchPyth, type PythSnapshot } from "./lib/pyth";
import { fetchOnchainSupply, type OnchainSupply } from "./lib/solana";
import { NavBar } from "./components/NavBar";
import { Hero } from "./components/Hero";
import { StatStrip, type Stat } from "./components/StatStrip";
import { CrossIssuerCompare } from "./components/CrossIssuerCompare";
import { BasketCard } from "./components/BasketCard";
import { TokenExplorer } from "./components/TokenExplorer";
import { TesseraCard } from "./components/TesseraCard";

const REFRESH_MS = 45_000; // keep the page feeling live
const MAX_HISTORY = 20; // rolling trading-price points per token for the sparkline

export default function App() {
  const [preStocks, setPreStocks] = useState<RankedPreStock[] | null>(null);
  const [tessera, setTessera] = useState<TesseraToken[] | null>(null);
  const [summary, setSummary] = useState<MispricingSummary | null>(null);
  const [pyth, setPyth] = useState<PythSnapshot | null>(null);
  const [onchain, setOnchain] = useState<Record<string, OnchainSupply>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard so on-chain supply is fetched just once, after the token set is known.
  const onchainFetched = useRef(false);

  // In-memory rolling history of trading prices, keyed by token symbol.
  const historyRef = useRef<Record<string, number[]>>({});
  const [, setHistoryTick] = useState(0);

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

  // Once the token set is known, verify each mint's live supply directly on
  // Solana. Best-effort: on any failure the verification UI is simply omitted.
  useEffect(() => {
    if (onchainFetched.current || !preStocks || preStocks.length === 0) return;
    onchainFetched.current = true;
    fetchOnchainSupply(
      preStocks.map((t) => t.contract_address),
      // Reveal each badge the moment its mint verifies, rather than all at once.
      (mint, supply) =>
        setOnchain((prev) => ({ ...prev, [mint]: supply })),
    ).catch(() => setOnchain({}));
  }, [preStocks]);

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

  const verifiedCount = Object.keys(onchain).length;

  const stats: Stat[] = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: "Tokens tracked",
        value: String(summary.tokenCount),
        sub:
          verifiedCount > 0
            ? `${verifiedCount} verified on-chain ✓`
            : "live from PreStocks",
      },
      {
        label: "Trading at a discount",
        value: `${summary.discountCount} / ${summary.tokenCount}`,
        sub: "below stated fair value",
        tone: "good",
      },
      {
        label: "Biggest discount",
        value: spotlight ? formatPercent(spotlight.deviationPercent) : "—",
        sub: spotlight
          ? spotlight.name.replace(/\s*PreStocks$/i, "")
          : undefined,
        tone: "good",
      },
      {
        label: "Cross-issuer companies",
        value: String(pairs.length),
        sub: "priced by both issuers",
        tone: "brand",
      },
    ];
  }, [summary, spotlight, pairs.length, verifiedCount]);

  const pythOpenAiUsd = pyth?.available ? pyth.prices?.openai?.price : undefined;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <NavBar pyth={pyth} updatedAt={updatedAt} />

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <Hero
          summary={summary}
          spotlight={spotlight}
          crossIssuerCount={pairs.length}
        />

        {stats.length > 0 && (
          <div className="mb-14">
            <StatStrip stats={stats} />
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            Couldn't load PreStocks data: {error}
          </div>
        )}

        {/* The flagship view — cross-issuer comparison */}
        {pairs.length > 0 && (
          <section id="cross-issuer" className="mb-16 scroll-mt-20">
            <SectionHeading
              eyebrow="The flagship view"
              title="Same company, two issuers, two prices"
              subtitle="These companies are tokenized by both PreStocks and Tessera — at different implied valuations and different legal structures. Nowhere else shows them side by side."
            />
            <CrossIssuerCompare pairs={pairs} pythOpenAiUsd={pythOpenAiUsd} />
          </section>
        )}

        {/* Blended baskets */}
        {baskets.length > 0 && (
          <section id="baskets" className="mb-16 scroll-mt-20">
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

        {/* Full PreStocks token list */}
        <section id="tokens" className="mb-16 scroll-mt-20">
          <SectionHeading
            eyebrow="PreStocks · tokenized pre-IPO stocks"
            title="Every token, ranked by mispricing"
            subtitle="Backed 1:1 by SPV exposure. Sorted by biggest gap — a discount trades below fair value, a premium above. Each links back to PreStocks and out to a live Jupiter trade."
          />
          {!preStocks && !error ? (
            <SkeletonGrid />
          ) : preStocks ? (
            <TokenExplorer
              tokens={preStocks}
              history={historyRef.current}
              onchain={onchain}
            />
          ) : null}
        </section>

        {/* Remaining Tessera tokens not already paired above */}
        <section className="mb-16 scroll-mt-20">
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
      </main>
    </div>
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
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{subtitle}</p>
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
    <footer className="border-t border-slate-900 pt-8 text-xs text-slate-600">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-gold-300 to-gold-500 text-xs font-black text-navy-950">
          F
        </span>
        <span className="text-sm font-bold text-slate-300">
          Fair<span className="text-gold-400">Mark</span>
        </span>
      </div>
      <p className="max-w-3xl leading-relaxed">
        Tokens &amp; data by{" "}
        <FooterLink href="https://prestocks.com/products">PreStocks</FooterLink>{" "}
        and <FooterLink href="https://app.tessera.pe">Tessera</FooterLink>.
        Oracle reference prices by{" "}
        <FooterLink href="https://www.pyth.network">Pyth Network</FooterLink>.
        Trades open on <FooterLink href="https://jup.ag">Jupiter</FooterLink>.
        FairMark is a discovery tool — it never connects to your wallet or holds
        funds. Not investment advice.
      </p>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200"
    >
      {children}
    </a>
  );
}
