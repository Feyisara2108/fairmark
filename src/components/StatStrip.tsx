export interface Stat {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad" | "brand";
}

const TONE: Record<NonNullable<Stat["tone"]>, string> = {
  default: "text-slate-100",
  good: "text-emerald-300",
  bad: "text-rose-300",
  brand: "text-gold-300",
};

/**
 * A row of at-a-glance KPIs beneath the hero — the scannable summary a trader
 * wants before diving into individual tokens.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {s.label}
          </p>
          <p
            className={`font-num mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl ${
              TONE[s.tone ?? "default"]
            }`}
          >
            {s.value}
          </p>
          {s.sub && <p className="mt-1 text-xs text-slate-500">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
