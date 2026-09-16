import type { MispricingSummary } from "../lib/types";
import { formatValuation } from "../lib/fairmark";

/**
 * Feature B — the first thing a visitor sees: the total dollar mispricing live
 * across all PreStocks tokens right now.
 */
export function MispricingHeadline({
  summary,
  updatedAt,
}: {
  summary: MispricingSummary | null;
  updatedAt: Date | null;
}) {
  return (
    <section className="mb-12 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 sm:p-10">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live mispricing across tokenized pre-IPO stocks
      </div>

      <p className="mt-4 text-5xl font-bold tracking-tight text-slate-50 sm:text-7xl">
        {summary ? (
          formatValuation(summary.totalMispricingUsd)
        ) : (
          <span className="inline-block h-14 w-72 animate-pulse rounded-lg bg-slate-800 align-middle" />
        )}
      </p>

      <p className="mt-4 max-w-2xl text-lg text-slate-400">
        of mispricing sitting in the open right now
        {summary && (
          <>
            {" "}
            across{" "}
            <span className="font-semibold text-slate-200">
              {summary.tokenCount} tokens
            </span>{" "}
            —{" "}
            <span className="font-semibold text-emerald-300">
              {summary.discountCount} trading at a discount
            </span>
            ,{" "}
            <span className="font-semibold text-rose-300">
              {summary.premiumCount} at a premium
            </span>
            .
          </>
        )}
      </p>

      {updatedAt && (
        <p className="mt-4 text-xs text-slate-600">
          Updated {updatedAt.toLocaleTimeString("en-US")} · auto-refreshing
        </p>
      )}
    </section>
  );
}
