import { useState } from "react";

export function Landing() {
  return (
    <div className="noir-texture min-h-screen bg-[#0a0a0a] text-white antialiased">
      <Nav />
      <Hero />
      <Features />
      <Download />
      <Pricing />
      <Footer />
    </div>
  );
}

/* ----------------------------------------------------------------- */

function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-[#1c1c1c] bg-[#0a0a0a]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold tracking-tighter text-black">
            OD
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">OmniDesk</span>
        </div>
        <div className="hidden items-center space-x-8 font-mono text-xs uppercase tracking-wider text-[#999999] md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#download" className="transition-colors hover:text-white">Download</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
        </div>

        {/* Top-right actions: Web version button + prominent Download for Mac */}
        <div className="flex items-center gap-2.5">
          <a
            href="#/app"
            className="rounded-lg border border-[#333333] bg-[#141414] px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:border-white"
          >
            Web version
          </a>
          <a
            href="#download"
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-[#d4d4d4]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
            Download for Mac
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <div className="mx-auto mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-3.5 text-black shadow-2xl">
          <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="3" />
            <path d="m9 9 6 6" />
            <path d="m15 9-6 6" />
          </svg>
        </div>

        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[#888888]">
          Your personal AI desk
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Meet OmniDesk.
          <br />
          <span className="text-[#888888]">AI where your work already is.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl font-mono text-sm leading-relaxed text-[#aaaaaa]">
          OmniDesk writes in your voice and answers anything. Summon it with one
          shortcut, type a question, and get back to work. No new tab, no fuss.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => (window.location.hash = "#/app")}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[#d4d4d4] sm:w-auto"
          >
            Open Web Version
            <span className="transition-transform group-hover:translate-x-0.5">➔</span>
          </button>
          <a
            href="#download"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#333333] bg-[#141414] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white sm:w-auto"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
            Download for Mac
          </a>
        </div>
        <p className="mt-4 font-mono text-[11px] text-[#666666]">
          The web version is free with your own Gemini key. No account needed.
        </p>
      </div>
    </header>
  );
}

function Features() {
  const items = [
    {
      title: "Writes in your voice",
      body: "Paste one sample of your writing. OmniDesk learns your tone, length, and quirks, then drafts emails and messages that sound like you wrote them.",
      badge: "STYLE MATCH",
    },
    {
      title: "Summon from anywhere",
      body: "A quick-search bar is one shortcut away. Hit the hotkey, type your question, and the answer appears without breaking your flow.",
      badge: "HOTKEY",
    },
    {
      title: "Ask anything",
      body: "Research, math, reading, and writing in clear natural answers. Pick the model that fits the task from a simple dropdown.",
      badge: "MULTI-MODEL",
    },
    {
      title: "Built for your workflow",
      body: "Connectivity to Microsoft 365 and Google Workspace is on the way, so OmniDesk can work right alongside your mail, calendar, and docs.",
      badge: "COMING SOON",
    },
  ];
  return (
    <section id="features" className="border-t border-[#1c1c1c] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#888888]">
            What it does
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One desk. Every task.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-[#242424] bg-[#111111] p-6 transition-all hover:border-[#444444]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold">{it.title}</h3>
                <span className="rounded border border-[#3a3a3a] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#999999]">
                  {it.badge}
                </span>
              </div>
              <p className="font-mono text-sm leading-relaxed text-[#999999]">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Download() {
  return (
    <section id="download" className="border-t border-[#1c1c1c] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#888888]">
            Get OmniDesk
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Use it your way.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Web version: available now */}
          <div className="flex flex-col rounded-2xl border border-[#2e2e2e] bg-[#121212] p-8">
            <div className="mb-4 flex items-center justify-between">
              <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              <span className="rounded-full border border-[#3a5a3a] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#7fae7f]">
                Available now
              </span>
            </div>
            <h3 className="text-xl font-bold">Web App</h3>
            <p className="mt-2 flex-1 font-mono text-sm leading-relaxed text-[#999999]">
              Runs in your browser. Nothing to install. Add a free Gemini key and
              start in under a minute.
            </p>
            <button
              onClick={() => (window.location.hash = "#/app")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#d4d4d4]"
            >
              Open Web Version ➔
            </button>
          </div>

          {/* Mac version: coming soon */}
          <div className="flex flex-col rounded-2xl border border-[#242424] bg-[#0e0e0e] p-8">
            <div className="mb-4 flex items-center justify-between">
              <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
              </svg>
              <span className="rounded-full border border-[#3a3a3a] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#999999]">
                Coming soon
              </span>
            </div>
            <h3 className="text-xl font-bold">Mac App</h3>
            <p className="mt-2 flex-1 font-mono text-sm leading-relaxed text-[#999999]">
              A native desktop app with a global hotkey, so you can summon OmniDesk
              over any screen, anytime. In development now.
            </p>
            <button
              disabled
              className="mt-6 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#333333] bg-[#141414] px-5 py-2.5 text-sm font-semibold text-[#777777]"
            >
              Download for Mac (soon)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-t border-[#1c1c1c] py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#888888]">
          Pricing
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Plans are on the way.
        </h2>
        <p className="mx-auto mt-4 max-w-md font-mono text-sm leading-relaxed text-[#999999]">
          We are still shaping the right plans for OmniDesk. For now, the web app
          is free to use with your own Gemini key.
        </p>

        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-[#2e2e2e] bg-[#111111] p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3a3a3a] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#aaaaaa]">
            <span className="pulse-mono h-1.5 w-1.5 rounded-full bg-white" />
            Coming soon
          </div>
          <div className="mt-6 text-5xl font-bold tracking-tight text-[#555555]">?</div>
          <p className="mt-4 font-mono text-sm text-[#777777]">
            Pricing details will land here. Launch the free web app in the meantime.
          </p>
          <a
            href="#/app"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#d4d4d4]"
          >
            Try it free ➔
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const [year] = useState(() => new Date().getFullYear());
  return (
    <footer className="border-t border-[#1c1c1c] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 font-mono text-xs text-[#666666] sm:flex-row">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-[10px] font-bold text-black">
            OD
          </div>
          <span className="uppercase tracking-widest">OmniDesk</span>
        </div>
        <span>{year} OmniDesk. Your personal AI desk.</span>
      </div>
    </footer>
  );
}
