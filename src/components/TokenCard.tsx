import type { ReactNode } from "react";
import type { RankedPreStock } from "../lib/types";
import { formatUsd, formatValuation } from "../lib/fairmark";
import { DeviationBadge } from "./DeviationBadge";
import { Sparkline } from "./Sparkline";

export function TokenCard({
  token,
  history = [],
}: {
  token: RankedPreStock;
  history?: number[];
}) {
  const discount = token.deviationPercent < 0;

  // Direction since the previous refresh (feature D).
  const prev = history.length >= 2 ? history[history.length - 2] : undefined;
  const delta = prev !== undefined ? token.tokenPrice - prev : 0;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "▪";
  const arrowTone =
    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-600";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={token.image}
            alt=""
            className="h-10 w-10 rounded-full bg-slate-800 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <div>
            <h3 className="font-semibold leading-tight text-slate-100">
              {token.name.replace(/ PreStocks$/, "")}
            </h3>
            <p className="text-xs text-slate-500">{token.symbol}</p>
          </div>
        </div>
        <DeviationBadge value={token.deviationPercent} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Fair value" value={formatUsd(token.markPrice)} />
        <Metric
          label="Trading price"
          value={formatUsd(token.tokenPrice)}
          emphasis={discount ? "good" : "bad"}
          badge={
            prev !== undefined ? (
              <span className={`text-xs ${arrowTone}`} title="Change since last refresh">
                {arrow}
              </span>
            ) : undefined
          }
        />
        <Metric
          label="Implied valuation"
          value={formatValuation(token.impliedValuation)}
          muted
        />
        <Metric
          label="Fair valuation"
          value={formatValuation(token.markValuation)}
          muted
        />
      </div>

      {history.length >= 2 && (
        <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
          <span className="text-[11px] uppercase tracking-wide text-slate-600">
            Trading price, live
          </span>
          <Sparkline values={history} />
        </div>
      )}

      <a
        href={token.tradeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        Trade on Jupiter
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis,
  muted,
  badge,
}: {
  label: string;
  value: string;
  emphasis?: "good" | "bad";
  muted?: boolean;
  badge?: ReactNode;
}) {
  const valueTone =
    emphasis === "good"
      ? "text-emerald-300"
      : emphasis === "bad"
        ? "text-rose-300"
        : muted
          ? "text-slate-400"
          : "text-slate-100";
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`flex items-center gap-1.5 font-semibold tabular-nums ${valueTone}`}>
        {value}
        {badge}
      </p>
    </div>
  );
}
