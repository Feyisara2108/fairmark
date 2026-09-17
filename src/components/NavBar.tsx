import { formatUsd } from "../lib/fairmark";
import type { PythSnapshot } from "../lib/pyth";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "cross-issuer", label: "Cross-Issuer" },
  { id: "baskets", label: "Baskets" },
  { id: "tokens", label: "Tokens" },
] as const;

/**
 * Sticky top navigation — gives the page real structure: brand, section
 * anchors, a live SOL ticker (when Pyth is active), the last-updated clock, and
 * the primary Jupiter hand-off CTA. FairMark is wallet-free by design, so the
 * CTA is an outbound link, not a Connect Wallet.
 */
export function NavBar({
  pyth,
  updatedAt,
}: {
  pyth: PythSnapshot | null;
  updatedAt: Date | null;
}) {
  const sol = pyth?.available ? pyth.prices?.sol : null;

  return (
    <header className="sticky top-0 z-40 border-b border-navy-800/70 bg-navy-950/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <a href="#overview" className="flex items-center gap-2 shrink-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold-300 to-gold-500 text-sm font-black text-navy-950 shadow-lg shadow-gold-500/20">
            F
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-100">
            Fair<span className="text-gold-400">Mark</span>
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100"
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {sol && (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/5 px-2.5 py-1 text-xs font-medium text-amber-300 sm:inline-flex"
              title="Live SOL price via Pyth Network"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              SOL <span className="font-num">{formatUsd(sol.price)}</span>
            </span>
          )}
          {updatedAt && (
            <span className="hidden items-center gap-1.5 text-xs text-slate-500 lg:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {updatedAt.toLocaleTimeString("en-US")}
            </span>
          )}
          <a
            href="https://jup.ag"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-400 px-3.5 py-1.5 text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/25 transition-colors hover:bg-gold-300"
          >
            Trade on Jupiter <span aria-hidden>↗</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
