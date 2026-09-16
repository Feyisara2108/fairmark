import { formatPercent } from "../lib/fairmark";

/**
 * Color-coded deviation pill.
 *   premium (token trading above fair value) → amber/red, "buyer overpaying"
 *   discount (token trading below fair value) → green, "buying below fair value"
 * A near-zero band is treated as neutral so tiny noise doesn't scream.
 */
export function DeviationBadge({ value }: { value: number }) {
  const neutral = Math.abs(value) < 0.5;
  const premium = value > 0;

  const tone = neutral
    ? "bg-slate-700/60 text-slate-200 ring-slate-500/40"
    : premium
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/40"
      : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40";

  const label = neutral
    ? "At fair value"
    : premium
      ? "Premium"
      : "Discount";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${tone}`}
      title={
        premium
          ? "Trading above fair value — buyers risk overpaying"
          : "Trading below fair value — a potential discount for buyers"
      }
    >
      <span>{formatPercent(value)}</span>
      <span className="text-xs font-medium opacity-70">{label}</span>
    </span>
  );
}
