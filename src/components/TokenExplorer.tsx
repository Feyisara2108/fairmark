import { useMemo, useState } from "react";
import type { RankedPreStock } from "../lib/types";
import { formatCount, formatUsd, formatValuation } from "../lib/fairmark";
import { TokenCard } from "./TokenCard";
import { DeviationBadge } from "./DeviationBadge";

type Filter = "all" | "discount" | "premium";
type View = "cards" | "table";
type SortKey = "deviation" | "name" | "fair" | "price" | "valuation";

/**
 * The full PreStocks token list with trader-grade controls: search, a
 * discount/premium filter, sortable columns, and a card/table view toggle.
 */
export function TokenExplorer({
  tokens,
  history,
}: {
  tokens: RankedPreStock[];
  history: Record<string, number[]>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("cards");
  const [sortKey, setSortKey] = useState<SortKey>("deviation");
  const [asc, setAsc] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tokens.filter((t) => {
      if (filter === "discount" && t.deviationPercent >= 0) return false;
      if (filter === "premium" && t.deviationPercent <= 0) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)
      );
    });

    const dir = asc ? 1 : -1;
    const val = (t: RankedPreStock) => {
      switch (sortKey) {
        case "deviation":
          return Math.abs(t.deviationPercent);
        case "fair":
          return t.markPrice;
        case "price":
          return t.tokenPrice;
        case "valuation":
          return t.markValuation;
        default:
          return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      return dir * (val(a) - val(b));
    });
  }, [tokens, query, filter, sortKey, asc]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${tokens.length}` },
    { id: "discount", label: "Discounts" },
    { id: "premium", label: "Premiums" },
  ];

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id
                    ? "bg-slate-700/70 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company or symbol"
              className="w-52 rounded-xl border border-slate-800 bg-slate-900/60 py-1.5 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none"
            />
          </div>
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-0.5">
            {(["cards", "table"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-slate-700/70 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-500">
          No tokens match — try clearing the search or filter.
        </p>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <TokenCard
              key={t.contract_address}
              token={t}
              history={history[t.symbol]}
            />
          ))}
        </div>
      ) : (
        <TokenTable
          tokens={visible}
          sortKey={sortKey}
          asc={asc}
          onSort={(k) => {
            if (k === sortKey) setAsc((v) => !v);
            else {
              setSortKey(k);
              setAsc(false);
            }
          }}
        />
      )}
    </div>
  );
}

function TokenTable({
  tokens,
  sortKey,
  asc,
  onSort,
}: {
  tokens: RankedPreStock[];
  sortKey: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
}) {
  const cols: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: "Token", align: "left" },
    { key: "fair", label: "Fair value", align: "right" },
    { key: "price", label: "Trading price", align: "right" },
    { key: "deviation", label: "Deviation", align: "right" },
    { key: "valuation", label: "Valuation", align: "right" },
  ];

  const caret = (k: SortKey) => (sortKey === k ? (asc ? " ▲" : " ▼") : "");

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/60 text-left">
            {cols.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSort(c.key)}
                  className="transition-colors hover:text-slate-200"
                >
                  {c.label}
                  {caret(c.key)}
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trade
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr
              key={t.contract_address}
              className="border-b border-slate-800/60 transition-colors last:border-0 hover:bg-slate-900/40"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={t.image}
                    alt=""
                    className="h-7 w-7 rounded-full bg-slate-800 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility =
                        "hidden";
                    }}
                  />
                  <div>
                    <p className="font-semibold text-slate-100">
                      {t.name.replace(/ PreStocks$/, "")}
                    </p>
                    <p className="text-xs text-slate-500">{t.symbol}</p>
                  </div>
                </div>
              </td>
              <td className="font-num px-4 py-3 text-right text-slate-300">
                {formatUsd(t.markPrice)}
              </td>
              <td
                className={`font-num px-4 py-3 text-right font-semibold ${
                  t.deviationPercent < 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {formatUsd(t.tokenPrice)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex justify-end">
                  <DeviationBadge value={t.deviationPercent} />
                </span>
              </td>
              <td className="font-num px-4 py-3 text-right text-slate-400">
                {formatValuation(t.markValuation)}
                <span className="ml-1 text-[10px] text-slate-600">
                  · {formatCount(t.supply)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={t.tradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-gold-400 px-3 py-1.5 text-xs font-bold text-navy-950 transition-colors hover:bg-gold-300"
                >
                  Trade ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
