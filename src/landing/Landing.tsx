import { useEffect, useState } from "react";
import { SKILLS, type ToolId } from "../models/skills";
import { useReveal } from "../hooks/useReveal";
import { Arrow, CountUp, RollingWord, Section } from "./effects";
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
    <div className="site min-h-screen overflow-x-clip">
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Facts />
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

  // Mark the link for whichever section is crossing the middle of the screen.
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper">
            <Logo className="h-5 w-5" />
          </span>
          <span className="font-display text-[26px] leading-none">OmniDesk</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((l) => {
            const on = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={on ? "true" : undefined}
                className={`relative rounded-md px-3 py-2 text-sm transition-colors hover:text-ink ${
                  on ? "text-ink" : "text-muted"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-2.5 bottom-1.5 -z-10 h-2 rounded-sm bg-mark transition-opacity duration-300 ${
                    on ? "opacity-100" : "opacity-0"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a href="#/app/signin" className="hidden px-2 text-sm font-medium text-muted transition-colors hover:text-ink sm:block">
            Sign in
          </a>
          <a href="#/app" className="btn btn-ghost btn-sm">
            Web version
          </a>
          <a href="#download" className="btn btn-solid btn-sm">
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

const ROLL = [
  "research with sources",
  "think it through",
  "write in your voice",
  "run the numbers",
  "write the code",
  "plan the build",
];

function Hero() {
  return (
    <section id="top" className="relative px-6 pb-24 pt-32 md:pb-28 md:pt-40">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="rise inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Runs on Google Gemini. Bring your own key.
          </div>

          <h1
            aria-label="One AI. Every strength."
            className="font-display mt-7 text-[clamp(3.6rem,9vw,7.4rem)] leading-[0.92] tracking-[-0.02em]"
          >
            <span aria-hidden className="rise block" style={{ animationDelay: "100ms" }}>
              One AI.
            </span>
            <span aria-hidden className="rise block" style={{ animationDelay: "260ms" }}>
              Every <em className="mark italic">strength.</em>
            </span>
          </h1>

          <p className="rise font-display mt-8 text-3xl leading-tight md:text-[2.4rem]" style={{ animationDelay: "480ms" }}>
            Ask it to{" "}
            <em className="italic text-accent">
              <RollingWord words={ROLL} />
            </em>
          </p>

          <p className="rise mt-5 max-w-xl text-lg leading-relaxed text-muted" style={{ animationDelay: "640ms" }}>
            OmniDesk sets up Google Gemini for the job in front of you: sources for research, careful thinking for
            hard problems, real code for exact math, and your own voice for writing. No account, no subscription.
          </p>

          <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "800ms" }}>
            <button onClick={openApp} className="btn btn-solid">
              Open the web version
              <Arrow />
            </button>
            <a href="#download" className="btn btn-ghost">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d={APPLE_PATH} />
              </svg>
              Download for Mac
            </a>
            <a href="#tutorial" className="px-2 py-3 text-sm font-semibold text-muted underline decoration-line decoration-2 underline-offset-4 transition-colors hover:text-ink hover:decoration-accent">
              See how it works
            </a>
          </div>
        </div>

        <div className="rise relative" style={{ animationDelay: "500ms" }}>
          <div className="float-y">
            <DesktopDemo height="h-[390px]" />
          </div>
          <div className="absolute -bottom-5 -left-3 -rotate-6 rounded-xl border-2 border-ink bg-mark px-4 py-2 font-mono text-xs font-semibold shadow-[3px_3px_0_0_#16130e]">
            Mac shortcut: Option + /
          </div>
        </div>
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

function Facts() {
  const { ref, shown } = useReveal();
  return (
    <section className="relative z-10 border-y border-line bg-cream">
      <div ref={ref} className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="border-l border-line px-6 py-9 first:border-l-0 max-md:odd:border-l-0 md:px-8"
          >
            <div className="font-display text-6xl leading-none md:text-7xl">
              <CountUp to={s.value} run={shown} />
            </div>
            <div className="mt-3 text-sm text-muted">{s.label}</div>
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
      title={
        <>
          One model. Seven <em className="italic text-accent">ways to use it.</em>
        </>
      }
      intro="A skill sets Gemini up for a kind of job: the right instructions, plus the Gemini tools that suit it. Pick one under the message box."
    >
      <div className="border-b border-line">
        {SKILLS.map((s, i) => (
          <article
            key={s.id}
            className="group grid gap-5 border-t border-line py-9 md:grid-cols-[84px_minmax(0,1fr)_minmax(0,1.05fr)] md:gap-10 md:py-11"
          >
            <div className="font-display text-5xl leading-none text-line transition-colors duration-300 group-hover:text-accent md:text-6xl">
              {String(i + 1).padStart(2, "0")}
            </div>

            <div>
              <h3 className="font-display text-4xl leading-none md:text-5xl">
                <span className="mark-hover">{s.name}</span>
              </h3>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">{s.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(Object.keys(s.tools) as ToolId[]).filter((t) => s.tools[t]).length === 0 ? (
                  <span className="rounded-md border border-ink/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    No tools needed
                  </span>
                ) : (
                  (Object.keys(s.tools) as ToolId[])
                    .filter((t) => s.tools[t])
                    .map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-ink/25 bg-cream px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink"
                      >
                        {TOOL_LABEL[t]}
                      </span>
                    ))
                )}
              </div>
            </div>

            <blockquote className="self-start rounded-2xl border border-dashed border-ink/30 bg-cream/70 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Try asking</div>
              <p className="font-display mt-2 text-[1.45rem] italic leading-snug">&ldquo;{s.starter}&rdquo;</p>
            </blockquote>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-3xl border border-ink bg-mark/45 p-7 md:p-10">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink">Straight talk</div>
        <h3 className="font-display mt-3 text-4xl md:text-5xl">Gemini is still Gemini.</h3>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink/80">
          Skills do not turn it into a different model. They point Gemini&apos;s real tools at your task: Google Search
          for current facts, extended thinking for hard problems, and code execution for exact numbers. It can still
          make mistakes, so check anything that matters.
        </p>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------------- */

function Download() {
  return (
    <Section
      id="download"
      index="03"
      label="download"
      title={
        <>
          Use it <em className="italic text-accent">your way.</em>
        </>
      }
      intro="The web version works today in any modern browser. The Mac app adds the Option + / shortcut."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col rounded-3xl bg-ink p-9 text-paper md:p-11">
          <div className="flex items-start justify-between">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            <span className="rounded-full bg-mark px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink">
              Available now
            </span>
          </div>
          <h3 className="font-display mt-10 text-5xl">Web version</h3>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-paper/70">
            Nothing to install. Add a free Gemini key and start in under a minute. Every skill is included.
          </p>
          <button onClick={openApp} className="btn mt-9 self-start border-paper bg-paper text-ink">
            Open the web version
            <Arrow />
          </button>
        </div>

        <div className="flex flex-col rounded-3xl border border-dashed border-ink/40 bg-cream p-9 md:p-11">
          <div className="flex items-start justify-between">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={APPLE_PATH} />
            </svg>
            <span className="rounded-full border border-dashed border-ink/50 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
              Coming soon
            </span>
          </div>
          <h3 className="font-display mt-10 text-5xl">Mac app</h3>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">
            Press Option + / anywhere and the OmniDesk logo appears in the top right of your screen. Hover over it to
            search. For Apple silicon Macs (M1 and newer).
          </p>
          <button disabled className="btn btn-ghost mt-9 self-start">
            Download for Mac (soon)
          </button>
        </div>
      </div>
    </Section>
  );
}

function Pricing() {
  return (
    <Section
      id="pricing"
      index="04"
      label="pricing"
      title={
        <>
          Plans are <em className="italic text-accent">on the way.</em>
        </>
      }
    >
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-cream p-10 text-center md:p-12">
        <div className="inline-block -rotate-3 rounded-md border-2 border-accent px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Coming soon
        </div>
        <p className="mx-auto mt-7 max-w-sm text-[15px] leading-relaxed text-muted">
          We are still shaping the right plans. For now, the web version is free to use with your own Gemini key.
        </p>
        <button onClick={openApp} className="btn btn-solid mt-8">
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
    <Section
      id="faq"
      index="05"
      label="questions"
      title={
        <>
          Good <em className="italic text-accent">to know.</em>
        </>
      }
    >
      <div className="border-b border-line">
        {FAQS.map((f) => (
          <details key={f.q} className="group border-t border-line py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
              <span className="font-display text-3xl leading-tight md:text-4xl">{f.q}</span>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 transition-all group-open:rotate-45 group-open:border-ink group-open:bg-ink group-open:text-paper"
                aria-hidden
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-line bg-cream px-6 pb-10 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="font-display text-[clamp(4.5rem,17vw,14rem)] leading-[0.85] tracking-[-0.03em]">
          OmniDesk<span className="text-accent">.</span>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-line pt-6 font-mono text-xs text-muted sm:flex-row">
          <span>{new Date().getFullYear()} OmniDesk. Runs on Google Gemini with your own key.</span>
          <span className="flex gap-5">
            <a href="#skills" className="hover:text-ink">Skills</a>
            <a href="#tutorial" className="hover:text-ink">Tutorial</a>
            <a href="#/app" className="hover:text-ink">Web version</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
