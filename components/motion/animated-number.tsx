"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const DEFAULT_DURATION_MS = 500;

/**
 * Tweens toward `value` whenever it changes.
 *
 * Deliberately still on mount: the initial value is where the number already
 * is, not a change worth showing. Counting up from zero every time a page
 * mounted would fire on every tab switch and undercut the point of warming
 * the queries — the number would be late even though the data was not.
 */
export function useAnimatedNumber(value: number, duration = DEFAULT_DURATION_MS): number {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  const frame = useRef<number | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      current.current = value;
      return;
    }

    const from = current.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = t === 1 ? value : from + delta * eased;

      current.current = next;
      setDisplay(next);

      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);

    // Interrupting mid-tween leaves `current` wherever it stopped, so a value
    // that changes again picks up from what is on screen rather than snapping.
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, reduced]);

  return reduced ? value : display;
}

/**
 * A number that counts to its new value. `format` runs on every frame, so it
 * receives fractional input — currency formatters that round are fine.
 */
export function AnimatedNumber({
  value,
  format,
  duration,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const display = useAnimatedNumber(value, duration);
  return <span className={className}>{format(display)}</span>;
}
