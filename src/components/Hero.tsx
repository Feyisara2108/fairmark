import type { MispricingSummary, RankedPreStock } from "../lib/types";
import { formatPercent, formatUsd, formatValuation } from "../lib/fairmark";
import { useCountUp } from "../lib/useCountUp";

/**
 * The landing moment: a live, animated count-up of the total dollar mispricing
 * across every PreStocks token, a KPI strip, and a compact teaser for the
 * single best discount right now. This is the demo's opening hook.
 */
export function Hero({
  summary,
  spotlight,
  crossIssuerCount,
}: {
  summary: MispricingSummary | null;
  spotlight: RankedPreStock | null;
  crossIssuerCount: number;
}) {
  const animated = useCountUp(summary ? summary.totalMispricingUsd : null);

  return (
    <section id="overview" className="relative overflow-hidden">
      <div className="bg-aurora absolute inset-0 -z-10" />
      <div className="bg-grid absolute inset-0 -z-10 opacity-60" />

      <div className="pt-14 pb-10 sm:pt-20 sm:pb-14">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live across PreStocks &amp; Tessera — tokenized pre-IPO stocks
        </div>

        <h1 className="animate-fade-up mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-50 sm:text-6xl">
          The same private company,
          <br className="hidden sm:block" /> priced two ways — and nobody
          shows you the gap.
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Headline number */}
          <div className="animate-fade-up">
            <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
              Total mispricing sitting in the open, right now
            </p>
            <p className="font-num text-shine mt-2 text-6xl font-black tracking-tight sm:text-7xl">
              {animated !== null ? (
                formatValuation(animated)
              ) : (
                <span className="inline-block h-16 w-80 max-w-full animate-pulse rounded-xl bg-slate-800 align-middle" />
              )}
            </p>
            {summary && (
              <p className="mt-4 max-w-xl text-base text-slate-400">
                across{" "}
                <span className="font-semibold text-slate-200">
                  {summary.tokenCount} tokens
                </span>{" "}
                —{" "}
                <span className="font-semibold text-emerald-300">
                  {summary.discountCount} at a discount
                </span>
                ,{" "}
                <span className="font-semibold text-rose-300">
                  {summary.premiumCount} at a premium
                </span>
                . {crossIssuerCount > 0 && (
                  <>
                    {crossIssuerCount} companies are tokenized by{" "}
                    <span className="font-semibold text-gold-300">
                      both issuers
                    </span>{" "}
                    at different valuations.
                  </>
                )}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#cross-issuer"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-2.5 text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/25 transition-colors hover:bg-gold-300"
              >
                See the cross-issuer gap
              </a>
              <a
                href="#tokens"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/60"
              >
                Browse every token
              </a>
            </div>
          </div>

          {/* Best-deal teaser */}
          {spotlight && <DealTeaser token={spotlight} />}
        </div>
      </div>
    </section>
  );
}

function DealTeaser({ token }: { token: RankedPreStock }) {
  const company = token.name.replace(/\s*PreStocks$/i, "");
  const gap = token.markPrice - token.tokenPrice;

  return (
    <a
      href={token.tradeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="animate-fade-up group relative block overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 transition-colors hover:border-emerald-400/50"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
          Biggest discount right now
        </p>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-inset ring-emerald-500/40 font-num">
          {formatPercent(token.deviationPercent)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <img
          src={token.image}
          alt=""
          className="h-12 w-12 rounded-full bg-slate-800 object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
        <div>
          <h3 className="text-xl font-bold text-slate-50">{company}</h3>
          <p className="text-sm text-slate-400">
            <span className="font-num font-semibold text-emerald-300">
              {formatUsd(gap)}
            </span>{" "}
            below fair value per token
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div className="flex items-baseline gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Fair
            </p>
            <p className="font-num text-lg font-semibold text-slate-400 line-through">
              {formatUsd(token.markPrice)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Now
            </p>
            <p className="font-num text-2xl font-bold text-emerald-300">
              {formatUsd(token.tokenPrice)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-transform group-hover:translate-x-0.5">
          Grab it ↗
        </span>
      </div>
    </a>
  );
}
