import { useEffect, useState, type ComponentType } from "react";
import { prefersReducedMotion } from "./anim";
import { Arrow, Section } from "./effects";
import { AskStage, ConnectStage, KeyStage, StyleStage, SummonStage } from "./stages";

/** How long each step stays up before the next one starts. */
const STEP_MS = 9000;

interface Step {
  id: string;
  title: string;
  /** A concrete example first, then the plain-language idea. */
  example: string;
  actions: string[];
  note: string;
  Stage: ComponentType;
  link?: { href: string; label: string };
}

const STEPS: Step[] = [
  {
    id: "key",
    title: "Get your free Gemini key",
    example:
      "Think of a key like a library card. Google hands you one for free, and OmniDesk uses it to borrow Gemini on your behalf. (Google calls it an API key.)",
    actions: [
      "Open Google AI Studio and sign in with any Google account.",
      "Click Create API key.",
      "Choose Default Gemini Project, then click Create key.",
      "Copy the key. It starts with AQ. or AIza.",
    ],
    note: "Keep it private. If it ever leaks, delete it in AI Studio and make a new one.",
    Stage: KeyStage,
    link: { href: "https://aistudio.google.com/app/apikey", label: "Open Google AI Studio" },
  },
  {
    id: "connect",
    title: "Paste it into OmniDesk",
    example:
      "It is like putting your library card in your wallet once. OmniDesk remembers it, so you never paste it again.",
    actions: [
      "Open the web version or the Mac app.",
      "Click Connect in the top right.",
      "Paste your key and click Save.",
      "The button turns white and says Connected.",
    ],
    note: "Your key stays on your device. Your questions go straight from your device to Google.",
    Stage: ConnectStage,
  },
  {
    id: "ask",
    title: "Pick a skill and ask",
    example:
      "Ask about heat pumps with Research on, and you get an answer plus the web pages it used. Ask about a loan with Math on, and it runs real code instead of guessing.",
    actions: [
      "Pick a skill under the message box.",
      "Switch Search, Think, or Run code on or off.",
      "Type a question, or paste a screenshot, then press Enter.",
    ],
    note: "Search and Run code cannot be on together. That is a Gemini rule.",
    Stage: AskStage,
  },
  {
    id: "summon",
    title: "Summon it from anywhere on Mac",
    example:
      "You are writing an email and need one quick fact. Press Option + / and the OmniDesk logo pops up in the top right corner. No switching windows.",
    actions: [
      "Press Option + /.",
      "Hover over the logo and the search bar opens.",
      "Type, press Enter, and read the answer.",
      "Press Escape to clear it, or Option + / to hide it.",
    ],
    note: "The Mac app is coming soon. The web version already has every skill.",
    Stage: SummonStage,
  },
  {
    id: "style",
    title: "Teach it your writing style",
    example:
      "Paste one email you wrote. OmniDesk notices that you write short sentences, greet people by first name, and end with a question. After that, every draft sounds like you.",
    actions: [
      "Click Teach style.",
      "Paste a sample of your own writing.",
      "Click Learn my style.",
      "Pick the Write skill and ask for a draft.",
    ],
    note: "It only learns from what you paste.",
    Stage: StyleStage,
  },
];

export function Tutorial() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);

  // Auto-play is off for people who asked their system for less motion.
  useEffect(() => setAuto(!prefersReducedMotion()), []);

  const step = STEPS[active];
  const Stage = step.Stage;
  const next = () => setActive((a) => (a + 1) % STEPS.length);

  return (
    <Section
      id="tutorial"
      index="02"
      label="get started"
      title={
        <>
          From zero to your first answer in <em className="italic text-accent">five steps.</em>
        </>
      }
      intro="No account, no card. Watch the steps play, or click any step to jump to it."
    >
      <div
        className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const on = i === active;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setActive(i)}
                  aria-current={on ? "step" : undefined}
                  className={`group w-full rounded-2xl border p-5 text-left transition-all duration-300 ${
                    on
                      ? "border-ink bg-cream shadow-[5px_5px_0_0_#16130e]"
                      : "border-transparent hover:border-line hover:bg-cream/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl transition-colors ${
                        on ? "bg-accent text-paper" : "border border-ink/25 text-muted group-hover:border-ink group-hover:text-ink"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`font-display text-2xl leading-tight md:text-3xl ${on ? "text-ink" : "text-muted"}`}>
                      {s.title}
                    </span>
                  </div>

                  {on && (
                    <div className="mt-5 pl-[52px]">
                      <p className="text-[15px] leading-relaxed text-ink">{s.example}</p>
                      <ol className="mt-4 space-y-2 text-[15px] text-muted">
                        {s.actions.map((a, n) => (
                          <li key={a} className="flex gap-3">
                            <span className="font-mono text-xs leading-6 text-accent">{n + 1}.</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-4 border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted">{s.note}</p>
                      {s.link && (
                        <a
                          href={s.link.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-ghost btn-sm mt-5"
                        >
                          {s.link.label}
                          <Arrow className="h-3.5 w-3.5" diagonal />
                        </a>
                      )}
                      {auto && (
                        <div className="mt-5 h-0.5 overflow-hidden rounded bg-line" aria-hidden>
                          <div
                            key={active}
                            className="step-fill h-full bg-accent"
                            style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                            onAnimationEnd={next}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div key={step.id} className="pop-in">
            <Stage />
          </div>
          <p className="mt-4 text-center font-mono text-[11px] text-muted">
            Example screens. The real app looks the same, with your own chats.
          </p>
        </div>
      </div>
    </Section>
  );
}
