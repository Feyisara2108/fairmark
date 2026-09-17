import type { CrossIssuerPair } from "../lib/types";
import {
  formatPercent,
  formatUsd,
  formatValuation,
  jupiterTradeUrl,
} from "../lib/fairmark";

// Token structure differs by issuer — sourced from each platform's own docs.
// PreStocks: "backed 1:1 by SPV exposure" (from its token descriptions).
// Tessera: pre-IPO exposure via a loan-participation right.
const STRUCTURE = {
  prestocks: "SPV equity exposure · backed 1:1",
  tessera: "Loan-participation right",
} as const;

/**
 * The flagship view. Same company, two issuers, two prices, two legal
 * structures, side by side — with a visual valuation bar so the spread is
 * immediately legible. This is the hardest-to-replicate element of the product.
 * When a Pyth oracle price exists (OpenAI is the only pre-IPO name with a feed),
 * it's shown as an independent third reference.
 */
export function CrossIssuerCompare({
  pairs,
  pythOpenAiUsd,
}: {
  pairs: CrossIssuerPair[];
  pythOpenAiUsd?: number;
}) {
  if (pairs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {pairs.map((pair) => (
        <PairCard
          key={pair.companyKey}
          pair={pair}
          pythUsd={pair.companyKey === "openai" ? pythOpenAiUsd : undefined}
        />
      ))}
    </div>
  );
}

function PairCard({
  pair,
  pythUsd,
}: {
  pair: CrossIssuerPair;
  pythUsd?: number;
}) {
  const { prestocks, tessera, markSpreadPercent } = pair;
  const prestocksDearer = markSpreadPercent > 0;

  const maxVal = Math.max(prestocks.markValuation, tessera.markValuation) || 1;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={prestocks.image}
            alt=""
            className="h-10 w-10 rounded-full bg-slate-800 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {pair.displayName}
            </h3>
            <p className="text-xs text-slate-500">
              Tokenized by both PreStocks &amp; Tessera
            </p>
          </div>
        </div>
        <span
          className="font-num rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-bold text-gold-300 ring-1 ring-inset ring-gold-500/40"
          title="How far PreStocks' implied company valuation sits above/below Tessera's for the same company"
        >
          {formatPercent(markSpreadPercent)} spread
        </span>
      </div>

      {/* Visual valuation comparison — the spread you can see. */}
      <div className="mb-4 space-y-2.5 rounded-xl bg-slate-950/40 p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Implied company valuation
        </p>
        <ValuationBar
          label="PreStocks"
          valuation={prestocks.markValuation}
          pct={(prestocks.markValuation / maxVal) * 100}
          tone="gold"
          dearer={prestocksDearer}
        />
        <ValuationBar
          label="Tessera"
          valuation={tessera.markValuation}
          pct={(tessera.markValuation / maxVal) * 100}
          tone="sky"
          dearer={!prestocksDearer}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IssuerColumn
          issuer="PreStocks"
          structure={STRUCTURE.prestocks}
          fairValue={formatUsd(prestocks.markPrice)}
          tradingPrice={formatUsd(prestocks.tokenPrice)}
          deviation={prestocks.deviationPercent}
          tradeUrl={prestocks.tradeUrl}
          highlight={prestocksDearer}
        />
        <IssuerColumn
          issuer="Tessera"
          structure={STRUCTURE.tessera}
          fairValue={formatUsd(tessera.markPrice)}
          tradingPrice={null}
          deviation={null}
          tradeUrl={jupiterTradeUrl(tessera.mint)}
          highlight={!prestocksDearer}
        />
      </div>

      {pythUsd !== undefined && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              Pyth oracle reference · 24/7
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
              Independent on-chain price, by Pyth Network
            </p>
          </div>
          <p className="font-num text-lg font-bold text-amber-200">
            {formatUsd(pythUsd)}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Same underlying company, two issuers.{" "}
        <span className="font-semibold text-slate-300">
          {prestocksDearer ? "PreStocks" : "Tessera"} values it richer by{" "}
          {Math.abs(markSpreadPercent).toFixed(1)}%
        </span>{" "}
        (by implied valuation — per-token prices differ in denomination and
        aren't directly comparable).
      </p>
    </div>
  );
}

function ValuationBar({
  label,
  valuation,
  pct,
  tone,
  dearer,
}: {
  label: string;
  valuation: number;
  pct: number;
  tone: "gold" | "sky";
  dearer: boolean;
}) {
  const barColor =
    tone === "gold"
      ? "from-gold-500 to-gold-300"
      : "from-sky-500 to-sky-400";
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-medium text-slate-400">
        {label}
      </span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-800/60">
        <div
          className={`h-full rounded-md bg-gradient-to-r ${barColor} transition-[width] duration-700`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
        <span className="font-num absolute inset-y-0 right-2 flex items-center text-xs font-bold text-slate-100">
          {formatValuation(valuation)}
          {dearer && <span className="ml-1 text-[10px] text-slate-300">▲</span>}
        </span>
      </div>
    </div>
  );
}

function IssuerColumn({
  issuer,
  structure,
  fairValue,
  tradingPrice,
  deviation,
  tradeUrl,
  highlight,
}: {
  issuer: string;
  structure: string;
  fairValue: string;
  tradingPrice: string | null;
  deviation: number | null;
  tradeUrl: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        highlight
          ? "border-gold-500/40 bg-gold-500/5"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">{issuer}</p>
        {highlight && (
          <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-300">
            Richer
          </span>
        )}
      </div>
      <p className="text-[11px] leading-tight text-slate-500">{structure}</p>

      <div className="mt-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Fair value
        </p>
        <p className="font-num font-semibold text-slate-100">{fairValue}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Trading price
        </p>
        {tradingPrice ? (
          <p className="font-num font-semibold text-slate-100">
            {tradingPrice}
            {deviation !== null && (
              <span
                className={`ml-1.5 text-xs ${
                  deviation < 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatPercent(deviation)}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-slate-600">not published</p>
        )}
      </div>

      <a
        href={tradeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
      >
        Trade <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
