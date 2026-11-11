import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReveal } from "../hooks/useReveal";

// These pieces come from the portfolio site. They use no animation library.

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Types text out one character at a time, then keeps a blinking caret. */
export function Typewriter({ text, startDelay = 500 }: { text: string; startDelay?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduceMotion()) {
      setN(text.length);
      return;
    }
    let iv: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      let i = 0;
      iv = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length && iv) clearInterval(iv);
      }, 85);
    }, startDelay);
    return () => {
      clearTimeout(start);
      if (iv) clearInterval(iv);
    };
  }, [text, startDelay]);

  return (
    <span aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      <span aria-hidden className="caret" />
    </span>
  );
}

/** A thin bar at the top of the page that fills as you scroll. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[70] h-[2px] bg-transparent">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-accent-deep via-accent to-sunrise"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

/** A soft glowing orb locked to the cursor. Mouse users only. */
export function CursorDots() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine || reduceMotion()) return;
    const orb = orbRef.current;
    if (!orb) return;

    const onMove = (e: MouseEvent) => {
      orb.style.opacity = "1";
      orb.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    };
    const onLeave = () => {
      orb.style.opacity = "0";
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={orbRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden rounded-full md:block"
      style={{
        width: 22,
        height: 22,
        opacity: 0,
        background: "radial-gradient(circle at 35% 30%, #ff9a4d 0%, #9b7bea 35%, #6b48d6 80%)",
        boxShadow: "0 0 16px 3px #9b7bea99, 0 0 38px 8px #6b48d666",
        willChange: "transform",
      }}
    />
  );
}

type Wave = { offset: number; amp: number; freq: number; rgb: string; alpha: number };

const WAVES: Wave[] = [
  { offset: 0, amp: 70, freq: 0.003, rgb: "155,123,234", alpha: 0.55 },
  { offset: Math.PI / 2, amp: 90, freq: 0.0026, rgb: "107,72,214", alpha: 0.5 },
  { offset: Math.PI, amp: 60, freq: 0.0034, rgb: "183,157,242", alpha: 0.35 },
  { offset: Math.PI * 1.5, amp: 80, freq: 0.0022, rgb: "255,154,77", alpha: 0.3 },
  { offset: Math.PI * 2, amp: 50, freq: 0.004, rgb: "255,255,255", alpha: 0.12 },
];

/** Glowing waves that bend toward the cursor. Pauses when off screen. */
export function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = reduceMotion();
    let w = 0;
    let h = 0;
    let t = 0;
    let raf = 0;
    let visible = true;
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mouse.x = target.x = w / 2;
      mouse.y = target.y = h * 0.86;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const baseY = h * 0.86;
      const radius = 320;
      for (const wave of WAVES) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const dx = x - mouse.x;
          const dy = baseY - mouse.y;
          const influence = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
          const bend = influence * 70 * Math.sin(t * 0.001 + x * 0.01 + wave.offset);
          const y =
            baseY +
            Math.sin(x * wave.freq + t * 0.002 + wave.offset) * wave.amp +
            Math.sin(x * wave.freq * 0.4 + t * 0.003) * (wave.amp * 0.45) +
            bend;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(${wave.rgb},${wave.alpha})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(${wave.rgb},0.9)`;
        ctx.stroke();
      }
    };

    const loop = () => {
      t += 16;
      mouse.x += (target.x - mouse.x) * 0.1;
      mouse.y += (target.y - mouse.y) * 0.1;
      draw();
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
    });

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    io.observe(canvas);

    if (reduce) draw();
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/** An endless ribbon. The list is doubled so the loop is seamless. */
export function Marquee({ items, label }: { items: string[]; label: string }) {
  const loop = [...items, ...items];
  return (
    <div className="marquee glass-band relative overflow-hidden border-y border-white/10 py-5" aria-label={label}>
      <div className="marquee-track gap-3 pr-3">
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            aria-hidden={i >= items.length}
            className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-white/75"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sunrise" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Counts from 0 up to the target once it scrolls into view. */
export function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (reduceMotion()) {
      setV(to);
      return;
    }
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);

  return <>{v}</>;
}

/** A page section that fades up when it scrolls into view. */
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
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section id={id} className="border-t border-white/5 px-6 py-24">
      <div
        ref={ref}
        className={`mx-auto max-w-6xl transition-all duration-700 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="flex items-baseline gap-3 font-mono text-sm uppercase tracking-[0.18em] text-accent">
          <span>{index}</span>
          <span className="text-haze">{label}</span>
        </div>
        <h2 className="text-balance mt-4 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        {intro && <p className="text-balance mt-4 max-w-2xl text-base text-haze md:text-lg">{intro}</p>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/** The SVG filter behind the "liquid" glass buttons in Chrome. */
export function LiquidFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id="liquid" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="22" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** Arrow icons drawn as shapes, so they never depend on a font having the character. */
export function Arrow({ className = "h-4 w-4", diagonal = false }: { className?: string; diagonal?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {diagonal ? <path d="M7 17L17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}
