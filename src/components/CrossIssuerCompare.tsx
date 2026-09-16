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
  prestocks: "SPV equity exposure, backed 1:1",
  tessera: "Loan participation right",
} as const;

/**
 * Feature A — the flagship view. Same company, two issuers, two prices, two
 * structures, side by side. This is the hardest-to-replicate element. When a
 * Pyth oracle price is available for a company (OpenAI is the only pre-IPO name
 * with a Pyth feed), it's shown as an independent third reference.
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

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={prestocks.image}
            alt=""
            className="h-9 w-9 rounded-full bg-slate-800 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <h3 className="text-lg font-semibold text-slate-100">
            {pair.displayName}
          </h3>
        </div>
        <span
          className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/40"
          title="How far PreStocks' implied company valuation sits above/below Tessera's for the same company"
        >
          {formatPercent(markSpreadPercent)} valuation spread
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <IssuerColumn
          issuer="PreStocks"
          structure={STRUCTURE.prestocks}
          fairValue={formatUsd(prestocks.markPrice)}
          tradingPrice={formatUsd(prestocks.tokenPrice)}
          deviation={prestocks.deviationPercent}
          valuation={formatValuation(prestocks.markValuation)}
          tradeUrl={prestocks.tradeUrl}
          highlight={prestocksDearer}
        />
        <IssuerColumn
          issuer="Tessera"
          structure={STRUCTURE.tessera}
          fairValue={formatUsd(tessera.markPrice)}
          tradingPrice={null}
          deviation={null}
          valuation={formatValuation(tessera.markValuation)}
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
              Independent on-chain valuation, priced by Pyth Network
            </p>
          </div>
          <p className="text-lg font-bold tabular-nums text-amber-200">
            {formatUsd(pythUsd)}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Same underlying company, two issuers.{" "}
        {prestocksDearer ? "PreStocks" : "Tessera"} values it richer by{" "}
        {Math.abs(markSpreadPercent).toFixed(1)}% (by implied valuation — per-token
        prices differ in denomination and aren't directly comparable).
      </p>
    </div>
  );
}

function IssuerColumn({
  issuer,
  structure,
  fairValue,
  tradingPrice,
  deviation,
  valuation,
  tradeUrl,
  highlight,
}: {
  issuer: string;
  structure: string;
  fairValue: string;
  tradingPrice: string | null;
  deviation: number | null;
  valuation: string;
  tradeUrl: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 ${
        highlight
          ? "border-indigo-500/40 bg-indigo-500/5"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <p className="text-sm font-semibold text-slate-200">{issuer}</p>
      <p className="text-[11px] leading-tight text-slate-500">{structure}</p>

      <div className="mt-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Fair value
        </p>
        <p className="font-semibold tabular-nums text-slate-100">{fairValue}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Trading price
        </p>
        {tradingPrice ? (
          <p className="font-semibold tabular-nums text-slate-100">
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

      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Implied valuation
        </p>
        <p className="font-semibold tabular-nums text-indigo-300">{valuation}</p>
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
