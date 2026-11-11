import { useEffect, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Walks through the moments of a little scripted scene, then starts over.
 *
 * `marks` are times in milliseconds. The result is how many of them have passed,
 * so a scene can show something once `phase >= 2`, and so on. After the last mark
 * it holds for `holdMs`, then loops. With reduced motion it jumps to the end.
 */
export function usePhase(marks: readonly number[], holdMs: number): number {
  const [phase, setPhase] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setPhase(marks.length);
      return;
    }
    setPhase(0);
    const timers = marks.map((ms, i) => window.setTimeout(() => setPhase(i + 1), ms));
    const end = window.setTimeout(() => setCycle((c) => c + 1), marks[marks.length - 1] + holdMs);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(end);
    };
    // The marks never change, so the scene only restarts when the cycle count does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle]);

  return phase;
}

/** Types `text` out once `start` is true. Resets when `start` goes false. */
export function useTyped(text: string, start: boolean, speed = 38): string {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!start) {
      setN(0);
      return;
    }
    if (prefersReducedMotion()) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(iv);
    }, speed);
    return () => window.clearInterval(iv);
  }, [text, start, speed]);

  return text.slice(0, n);
}
