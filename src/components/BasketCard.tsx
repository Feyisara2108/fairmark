import type { Basket } from "../lib/types";
import { formatPercent, formatUsd } from "../lib/fairmark";
import { DeviationBadge } from "./DeviationBadge";

/**
 * Feature C — a group of related tokens shown as one equal-weight blended index:
 * blended fair value vs blended trading price, and the resulting deviation.
 */
export function BasketCard({ basket }: { basket: Basket }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{basket.name}</h3>
          <p className="text-xs text-slate-500">{basket.description}</p>
        </div>
        <DeviationBadge value={basket.deviationPercent} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Blended fair value
          </p>
          <p className="font-semibold tabular-nums text-slate-100">
            {formatUsd(basket.blendedMarkPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Blended trading price
          </p>
          <p
            className={`font-semibold tabular-nums ${
              basket.deviationPercent < 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatUsd(basket.blendedTokenPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {basket.members.map((m) => (
          <span
            key={m.contract_address}
            className="rounded-md bg-slate-800/70 px-2 py-1 text-[11px] text-slate-400"
            title={`${formatPercent(m.deviationPercent)} vs fair value`}
          >
            {m.name.replace(/\s*PreStocks$/i, "")}
          </span>
        ))}
      </div>
    </div>
  );
}
