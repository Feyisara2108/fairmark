import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to `target` over `durationMs`,
 * easing out. Used for the headline mispricing figure so it visibly ticks up
 * on load (and re-animates smoothly when the value changes on refresh).
 * Returns `null` until the first real target arrives, so callers can show a
 * skeleton. Respects prefers-reduced-motion by snapping straight to the value.
 */
export function useCountUp(target: number | null, durationMs = 1400): number | null {
  const [value, setValue] = useState<number | null>(null);
  const fromRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === null) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const delta = target - from;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return value;
}
