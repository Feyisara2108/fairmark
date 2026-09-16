import type { RankedPreStock } from "../lib/types";
import { formatPercent, formatUsd } from "../lib/fairmark";

/**
 * PreStocks spotlight — surfaces the single biggest discount as a concrete,
 * actionable "best deal right now" call to action. Makes the PreStocks
 * integration the hero of the page, not just a row in a table.
 */
export function PreStocksSpotlight({ token }: { token: RankedPreStock }) {
  const gap = token.markPrice - token.tokenPrice; // $ under fair value per token
  const company = token.name.replace(/\s*PreStocks$/i, "");

  return (
    <div className="overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <img
            src={token.image}
            alt=""
            className="h-14 w-14 rounded-full bg-slate-800 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
              Best deal on PreStocks right now
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-50">{company}</h3>
            <p className="mt-1 text-sm text-slate-400">
              Trading{" "}
              <span className="font-semibold text-emerald-300">
                {formatPercent(token.deviationPercent)}
              </span>{" "}
              below its stated fair value — a{" "}
              <span className="font-semibold text-emerald-300">
                {formatUsd(gap)}
              </span>{" "}
              discount per token.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fair</p>
            <p className="text-lg font-semibold tabular-nums text-slate-300 line-through">
              {formatUsd(token.markPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Now</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-300">
              {formatUsd(token.tokenPrice)}
            </p>
          </div>
          <a
            href={token.tradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            Grab the discount ↗
          </a>
        </div>
      </div>
    </div>
  );
}
