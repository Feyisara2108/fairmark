import type { TesseraToken } from "../lib/types";
import { formatUsd, formatValuation, jupiterTradeUrl } from "../lib/fairmark";

/**
 * Tessera tokens have no on-chain trading price in the public API, so there's
 * no deviation to show — we present fair value, sector, holders as context and
 * still offer a Jupiter trade link.
 */
export function TesseraCard({ token }: { token: TesseraToken }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-tight text-slate-100">
            {token.name}
          </h3>
          <p className="text-xs text-slate-500">{token.sector}</p>
        </div>
        <span className="rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-500/40">
          No trading price
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Fair value
          </p>
          <p className="font-num font-semibold text-slate-100">
            {formatUsd(token.markPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Valuation
          </p>
          <p className="font-num font-semibold text-slate-400">
            {formatValuation(token.markValuation)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Holders
          </p>
          <p className="font-num font-semibold text-slate-400">
            {token.holders.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <a
        href={jupiterTradeUrl(token.mint)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
      >
        Trade on Jupiter
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
