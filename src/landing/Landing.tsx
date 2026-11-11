import { useEffect, useState } from "react";
import { SKILLS, type ToolId } from "../models/skills";
import { onSpotlightMove } from "../hooks/spotlight";
import { useReveal } from "../hooks/useReveal";
import {
  Arrow,
  CountUp,
  CursorDots,
  LiquidFilter,
  Marquee,
  ScrollProgress,
  Section,
  Typewriter,
  WaveBackground,
} from "./effects";
import { DesktopDemo, Logo } from "./stages";
import { Tutorial } from "./Tutorial";
import "./landing.css";

const TOOL_LABEL: Record<ToolId, string> = { search: "Search", think: "Think", code: "Run code" };

const APPLE_PATH =
  "M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z";

const openApp = () => {
  window.location.hash = "#/app";
};

export function Landing() {
  useEffect(() => {
    document.documentElement.classList.add("site-view");
    return () => document.documentElement.classList.remove("site-view");
  }, []);

  return (
    <div className="site relative min-h-screen overflow-x-clip bg-ink-950 text-white antialiased">
      <LiquidFilter />
      <div className="aurora" aria-hidden>
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>
      <div className="noise-overlay" />
      <ScrollProgress />
      <CursorDots />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Marquee
          label="What OmniDesk can do"
          items={[
            "Search the web with sources",
            "Think before answering",
            "Run real Python",
            "Read images and PDFs",
            "Write in your voice",
            "Turn ideas into specs",
            "Paste screenshots",
            "Mac shortcut",
            "Bring your own key",
          ]}
        />
        <Stats />
        <SkillsSection />
        <Tutorial />
        <Download />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------------------------------------------------------- */

const NAV = [
  { href: "#skills", label: "Skills" },
  { href: "#tutorial", label: "Tutorial" },
  { href: "#download", label: "Download" },
  { href: "#pricing", label: "Pricing" },
];

function Nav() {
  const [active, setActive] = useState("");

  // Highlight the link for whichever section is crossing the middle of the screen.
  useEffect(() => {
    const els = NAV.map((l) => document.getElementById(l.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <header className="glass-bar fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-950">
            <Logo className="h-5 w-5" />
          </span>
          <span className="font-mono text-sm font-medium uppercase tracking-[0.18em]">OmniDesk</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((l) => {
            const on = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={on ? "true" : undefined}
                className={`relative rounded-md px-3 py-2 text-sm transition-colors duration-200 hover:text-white ${
                  on ? "text-white" : "text-haze"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-accent to-sunrise transition-opacity duration-300 ${
                    on ? "opacity-100" : "opacity-0"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#/app/signin"
            className="hidden px-2 py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
          >
            Sign in
          </a>
          <a
            href="#/app"
            className="glass glass-chip rounded-lg px-3 py-2 text-xs font-semibold text-white sm:px-3.5"
          >
            Web version
          </a>
          <a
            href="#download"
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink-950 transition-opacity hover:opacity-90 sm:px-3.5"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={APPLE_PATH} />
            </svg>
            <span className="hidden sm:inline">Download for Mac</span>
            <span className="sm:hidden">Mac</span>
          </a>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------- */

const HEADLINE = ["One", "AI.", "Every", "strength."];

function Hero() {
  return (
    <section id="top" className="grid-backdrop relative flex min-h-screen items-center overflow-hidden px-6 pb-24 pt-28">
      <WaveBackground />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent-deep/30 blur-[140px]" />
      <div className="pointer-events-none absolute -top-10 right-[8%] h-[260px] w-[360px] rounded-full bg-sunrise/15 blur-[120px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="animate-fade-up font-mono text-sm uppercase tracking-[0.18em] text-accent">
            <Typewriter text="> your personal ai desk" />
          </p>

          <h1
            aria-label="One AI. Every strength."
            className="text-balance mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            {HEADLINE.map((w, i) => (
              <span
                key={w}
                aria-hidden
                className={`word-reveal mr-[0.25em] ${
                  i === HEADLINE.length - 1
                    ? "bg-gradient-to-r from-accent-soft via-accent to-sunrise bg-clip-text text-transparent"
                    : ""
                }`}
                style={{ animationDelay: `${300 + i * 140}ms` }}
              >
                {w}
              </span>
            ))}
          </h1>

          <p
            className="animate-fade-up text-balance mt-6 max-w-xl text-lg text-white/85 md:text-xl"
            style={{ animationDelay: "900ms" }}
          >
            OmniDesk sets up Google Gemini to research with sources, think hard problems through, run real
            code for exact math, write in your voice, and turn ideas into plans.
          </p>
          <p
            className="animate-fade-up text-balance mt-3 max-w-xl text-base text-haze"
            style={{ animationDelay: "1050ms" }}
          >
            Bring your own free Gemini key. No account, no subscription.
          </p>

          <div className="animate-fade-up mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "1200ms" }}>
            <button
              onClick={openApp}
              className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-deep to-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(155,123,234,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_36px_-4px_rgba(155,123,234,0.95)]"
            >
              Open the web version
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a href="#download" className="glass glass-chip flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d={APPLE_PATH} />
              </svg>
              Download for Mac
            </a>
            <a href="#tutorial" className="px-2 py-3 text-sm font-medium text-haze transition-colors hover:text-white">
              See how it works
            </a>
          </div>
        </div>

        <div className="animate-fade-up float-y" style={{ animationDelay: "700ms" }}>
          <DesktopDemo height="h-[360px]" />
          <p className="mt-3 text-center font-mono text-[11px] text-haze">The Mac shortcut, Option + /</p>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-8 left-1/2 hidden h-9 w-5 -translate-x-1/2 justify-center rounded-full border border-white/25 pt-2 sm:flex"
      >
        <span className="scroll-hint-dot h-1.5 w-1 rounded-full bg-sunrise" />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */

const STATS = [
  { value: SKILLS.length, label: "skills built in" },
  { value: 3, label: "Gemini tools wired in" },
  { value: 1, label: "free key to bring" },
  { value: 0, label: "accounts required" },
];

function Stats() {
  const { ref, shown } = useReveal();
  return (
    <section className="px-6 py-20">
      <div
        ref={ref}
        className={`mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 transition-all duration-700 lg:grid-cols-4 ${
          shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="border-l border-white/10 pl-5 transition-all duration-700"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="bg-gradient-to-br from-white via-accent-soft to-sunrise bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
              <CountUp to={s.value} run={shown} />
            </div>
            <div className="mt-2 text-sm text-haze">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- */

function SkillsSection() {
  return (
    <Section
      id="skills"
      index="01"
      label="skills"
      title="One model. Seven ways to use it."
      intro="A skill sets Gemini up for a kind of job: the right instructions, plus the Gemini tools that suit it. Pick one under the message box."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s, i) => (
          <article
            key={s.id}
            onPointerMove={onSpotlightMove}
            className="spotlight glass flex flex-col rounded-2xl p-6"
          >
            <div className="flex min-h-[22px] items-center justify-between">
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex gap-1.5">
                {(Object.keys(s.tools) as ToolId[])
                  .filter((t) => s.tools[t])
                  .map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/60"
                    >
                      {TOOL_LABEL[t]}
                    </span>
                  ))}
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold tracking-tight">{s.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">{s.summary}</p>
            <div className="mt-5 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-sunrise">Try</div>
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-white/80">{s.starter}</p>
            </div>
          </article>
        ))}

        <article className="glass glass-tint glass-static flex flex-col justify-center rounded-2xl p-6 sm:col-span-2 lg:col-span-2">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-sunrise">Straight talk</div>
          <h3 className="mt-3 text-xl font-bold tracking-tight">Gemini is still Gemini.</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Skills do not turn it into a different model. They point Gemini&apos;s real tools at your task: Google
            Search for current facts, extended thinking for hard problems, and code execution for exact numbers.
            It can still make mistakes, so check anything that matters.
          </p>
        </article>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------------- */

function Download() {
  return (
    <Section
      id="download"
      index="04"
      label="download"
      title="Use it your way."
      intro="The web version works today in any modern browser. The Mac app adds the Option + / shortcut."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass glass-tint flex flex-col rounded-2xl p-8">
          <div className="mb-5 flex items-center justify-between">
            <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            <span className="rounded-full border border-emerald-400/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
              Available now
            </span>
          </div>
          <h3 className="text-xl font-bold">Web version</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">
            Nothing to install. Add a free Gemini key and start in under a minute. Every skill is included.
          </p>
          <button
            onClick={openApp}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90"
          >
            Open the web version
            <Arrow />
          </button>
        </div>

        <div className="glass glass-static flex flex-col rounded-2xl p-8">
          <div className="mb-5 flex items-center justify-between">
            <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={APPLE_PATH} />
            </svg>
            <span className="rounded-full border border-white/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/60">
              Coming soon
            </span>
          </div>
          <h3 className="text-xl font-bold">Mac app</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">
            Press Option + / anywhere and the OmniDesk logo appears in the top right of your screen. Hover over it
            to search. For Apple silicon Macs (M1 and newer).
          </p>
          <button
            disabled
            className="mt-6 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/50"
          >
            Download for Mac (soon)
          </button>
        </div>
      </div>
    </Section>
  );
}

function Pricing() {
  return (
    <Section id="pricing" index="05" label="pricing" title="Plans are on the way.">
      <div className="glass glass-tint glass-static mx-auto max-w-lg rounded-2xl p-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sunrise" />
          Coming soon
        </div>
        <p className="mt-6 text-sm leading-relaxed text-white/75">
          We are still shaping the right plans. For now, the web version is free to use with your own Gemini key.
        </p>
        <button
          onClick={openApp}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-deep to-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
        >
          Try it free
          <Arrow />
        </button>
      </div>
    </Section>
  );
}

const FAQS = [
  {
    q: "Do I have to pay?",
    a: "OmniDesk itself is free to use right now. It runs on Gemini with your own key, and Google's free tier covers light use. Google sets those limits, and heavy use may need a paid Google plan. OmniDesk plans are coming soon.",
  },
  {
    q: "Is this a new AI model?",
    a: "No. It runs Google Gemini. OmniDesk changes how Gemini is used: the instructions, Google Search with sources, extended thinking, and code execution. That is why the skills feel different, even though the model underneath is the same.",
  },
  {
    q: "Where is my key stored?",
    a: "On your own device. Your questions go straight from your device to Google. When accounts launch, signing in will be optional, and it will sync your key (encrypted), your chosen skill, and your writing style across devices.",
  },
  {
    q: "Will it match other AI apps?",
    a: "It will not be identical, and we do not claim it is. The skills are built to give Gemini the habits people value elsewhere, like careful reasoning, cited research, clean writing, and code that actually runs. Try a skill on a real task and judge for yourself.",
  },
  {
    q: "What about Windows or iPhone?",
    a: "The web version works in any modern browser, including on a phone. A native Mac app is coming first. Other platforms are not planned yet.",
  },
];

function Faq() {
  return (
    <Section id="faq" index="06" label="questions" title="Good to know.">
      <div className="mx-auto max-w-3xl space-y-3">
        {FAQS.map((f) => (
          <details key={f.q} className="glass glass-static group rounded-2xl px-6 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
              {f.q}
              <span className="font-mono text-lg text-accent transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-mono text-xs text-haze sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-ink-950">
            <Logo className="h-4 w-4" />
          </span>
          <span className="uppercase tracking-[0.18em]">OmniDesk</span>
        </div>
        <span>{new Date().getFullYear()} OmniDesk. Runs on Google Gemini with your own key.</span>
      </div>
    </footer>
  );
}
