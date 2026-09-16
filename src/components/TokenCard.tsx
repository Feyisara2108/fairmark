import { useState, type ReactNode } from "react";
import type { RankedPreStock } from "../lib/types";
import { formatCount, formatUsd, formatValuation } from "../lib/fairmark";
import { DeviationBadge } from "./DeviationBadge";
import { Sparkline } from "./Sparkline";

// The SPV-backing sentence PreStocks appends to every token description; pulled
// out so we can surface the structure as its own labeled line.
const SPV_NOTE = /([A-Z0-9 ]+ is a PreStocks issued token[^]*?\.)\s*$/;

export function TokenCard({
  token,
  history = [],
}: {
  token: RankedPreStock;
  history?: number[];
}) {
  const [open, setOpen] = useState(false);
  const discount = token.deviationPercent < 0;

  // Direction since the previous refresh (feature D).
  const prev = history.length >= 2 ? history[history.length - 2] : undefined;
  const delta = prev !== undefined ? token.tokenPrice - prev : 0;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "▪";
  const arrowTone =
    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-600";

  const structure = token.description.match(SPV_NOTE)?.[1] ?? null;
  const blurb = structure
    ? token.description.replace(SPV_NOTE, "").trim()
    : token.description;

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
          label="Fair valuation"
          value={formatValuation(token.markValuation)}
          muted
        />
        <Metric
          label="Float"
          value={`${formatCount(token.supply)} tokens`}
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

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="-my-1 self-start text-xs font-medium text-slate-400 hover:text-slate-200"
        aria-expanded={open}
      >
        {open ? "Hide details ▲" : "About this token ▼"}
      </button>

      {open && (
        <div className="space-y-2 rounded-xl bg-slate-950/50 p-3 text-xs text-slate-400">
          <p>{blurb}</p>
          {structure && (
            <p className="text-slate-300">
              <span className="font-semibold text-indigo-300">Structure:</span>{" "}
              {structure}
            </p>
          )}
          <p className="flex justify-between gap-2">
            <span>Trading valuation</span>
            <span className="tabular-nums text-slate-300">
              {formatValuation(token.impliedValuation)}
            </span>
          </p>
          <p className="truncate font-mono text-[10px] text-slate-600">
            {token.contract_address}
          </p>
        </div>
      )}

      <div className="mt-1 flex items-center gap-2">
        <a
          href={token.tradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          Trade on Jupiter
          <span aria-hidden>↗</span>
        </a>
        <a
          href={token.external_url}
          target="_blank"
          rel="noopener noreferrer"
          title="View on PreStocks"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          PreStocks ↗
        </a>
      </div>
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
