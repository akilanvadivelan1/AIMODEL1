import { useEffect, useState, type ReactNode } from "react";
import { useReveal } from "../hooks/useReveal";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from 0 up to the target once it scrolls into view. */
export function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (reduceMotion()) {
      setV(to);
      return;
    }
    const dur = 1300;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);

  return <>{v}</>;
}

/** Arrow icons drawn as shapes, so they never depend on a font having the character. */
export function Arrow({ className = "h-4 w-4", diagonal = false }: { className?: string; diagonal?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {diagonal ? <path d="M7 17L17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

/**
 * A phrase that rolls up to the next one, over and over.
 * The first phrase is repeated at the end so the loop has no jump.
 */
export function RollingWord({ words }: { words: string[] }) {
  const list = [...words, words[0]];
  return (
    <span className="roll-box">
      <span className="sr-only">{words.join(", ")}</span>
      <span className="roll-col" aria-hidden>
        {list.map((w, i) => (
          <span key={i} className="roll-item">
            {w}.
          </span>
        ))}
      </span>
    </span>
  );
}

/** A page section with a small label, a big serif title, and a fade-up on scroll. */
export function Section({
  id,
  index,
  label,
  title,
  intro,
  children,
}: {
  id: string;
  index: string;
  label: string;
  title: ReactNode;
  intro?: string;
  children: ReactNode;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section id={id} className="border-t border-line px-6 py-24 md:py-32">
      <div
        ref={ref}
        className={`mx-auto max-w-6xl transition-all duration-700 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <span className="h-px w-10 bg-ink" />
          <span className="text-ink">{index}</span>
          <span>{label}</span>
        </div>
        <h2 className="font-display mt-6 max-w-4xl text-5xl leading-[1.02] tracking-tight md:text-7xl">{title}</h2>
        {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>}
        <div className="mt-14 md:mt-16">{children}</div>
      </div>
    </section>
  );
}
