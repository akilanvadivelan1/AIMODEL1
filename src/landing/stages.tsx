import type { ReactNode } from "react";
import { SKILLS } from "../models/skills";
import { usePhase, useTyped } from "./anim";

// Little animated mock screens for the tutorial. Everything shown here is an
// example. Nothing on these screens is real data.

export function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/80 bg-[#121212] shadow-[0_32px_60px_-28px_rgba(22,19,14,0.65)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#1a1a1a] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate font-mono text-[11px] text-white/50">{title}</span>
      </div>
      <div className="relative h-[340px] overflow-hidden">{children}</div>
    </div>
  );
}

function Cursor({ x, y, click }: { x: string; y: string; click?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-30 transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ left: x, top: y }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.2">
        <path d="M4 3l16 7-7 2-2 7z" />
      </svg>
      {click && <span className="ripple absolute -left-3.5 -top-3.5 h-8 w-8 rounded-full border-2 border-[#ff7a45]" />}
    </div>
  );
}

const Check = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

// ---------------------------------------------------------------------------
// 1. Get the key
// ---------------------------------------------------------------------------

const KEY_MARKS = [600, 1700, 2500, 3800, 5000, 6200] as const;

export function KeyStage() {
  const p = usePhase(KEY_MARKS, 2600);

  const cursor =
    p < 1 ? { x: "78%", y: "78%" }
    : p < 3 ? { x: "92px", y: "98px" }
    : p < 5 ? { x: "84%", y: "214px" }
    : { x: "82%", y: "152px" };

  return (
    <Frame title="aistudio.google.com/app/apikey (example)">
      <div className="h-full bg-[#0f1014] p-5">
        <div className="text-sm font-semibold text-white">API keys</div>
        <p className="mt-1 text-xs text-white/50">Create a key so apps can use Gemini for you.</p>
        <button
          tabIndex={-1}
          className={`mt-4 rounded-md bg-[#8ab4f8] px-3.5 py-1.5 text-xs font-semibold text-[#0b1a33] transition-transform ${
            p === 2 ? "scale-95" : ""
          }`}
        >
          Create API key
        </button>
        <div className="mt-6 space-y-2 opacity-40">
          <div className="h-2 w-2/3 rounded bg-white/15" />
          <div className="h-2 w-1/2 rounded bg-white/10" />
        </div>
      </div>

      {p >= 3 && p < 5 && (
        <div className="pop-in absolute inset-x-8 top-[88px] z-10 rounded-xl border border-white/10 bg-[#1b1c22] p-4 shadow-2xl">
          <div className="text-xs font-semibold text-white">Create API key</div>
          <div className="mt-3 text-[10px] uppercase tracking-wider text-white/40">Choose a project</div>
          <div className="mt-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-xs text-white/80">
            Default Gemini Project
          </div>
          <div className="mt-3 flex justify-end">
            <span className="rounded-md bg-[#8ab4f8] px-3 py-1.5 text-xs font-semibold text-[#0b1a33]">Create key</span>
          </div>
        </div>
      )}

      {p >= 5 && (
        <div className="pop-in absolute inset-x-8 top-[88px] z-10 rounded-xl border border-white/10 bg-[#1b1c22] p-4 shadow-2xl">
          <div className="text-xs font-semibold text-white">Your API key</div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-white/15 bg-black/30 px-3 py-2">
            <span className="truncate font-mono text-xs text-white/80">AQ.Ab8RN6x2••••••••••••••</span>
            <span className="flex shrink-0 items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-white">
              <Check /> {p >= 6 ? "Copied" : "Copy"}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-[#ff9b6a]">Keep it private. Anyone with this key can use your quota.</p>
        </div>
      )}

      <Cursor x={cursor.x} y={cursor.y} click={p === 2 || p === 4 || p === 6} />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 2. Paste it into OmniDesk
// ---------------------------------------------------------------------------

const CONNECT_MARKS = [500, 2300, 3200] as const;

export function ConnectStage() {
  const p = usePhase(CONNECT_MARKS, 2800);
  const typed = useTyped("AQ.Ab8RN6x2Kq9TzL4mWc", p >= 1, 55);

  return (
    <Frame title="OmniDesk (example)">
      <div className="h-full bg-[#121212]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-black">OD</span>
          <div className="flex gap-1.5 font-mono text-[10px]">
            <span className="rounded border border-white/15 px-2 py-1 text-white/60">Sign in</span>
            <span
              className={`flex items-center gap-1 rounded border px-2 py-1 font-bold transition-all duration-500 ${
                p >= 3 ? "border-white bg-white text-black" : "border-white/15 text-white/70"
              }`}
            >
              {p >= 3 ? "Connected" : "Connect"}
            </span>
          </div>
        </div>
        <div className="space-y-2 p-5 opacity-30">
          <div className="h-2 w-1/3 rounded bg-white/20" />
          <div className="h-2 w-2/3 rounded bg-white/10" />
        </div>
      </div>

      {p < 3 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-6">
          <div className="pop-in w-full max-w-[330px] rounded-xl border border-white/15 bg-[#121212] p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white">Connect a real model</div>
            <div className="mt-3 rounded-lg border border-white/20 bg-[#1a1a1a] px-3 py-2 font-mono text-[11px] text-white">
              {typed || <span className="text-white/30">Paste your Gemini key</span>}
              {p >= 1 && p < 2 && <span className="caret" />}
            </div>
            <div className="mt-3 flex justify-end">
              <span
                className={`rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-black transition-transform ${
                  p === 2 ? "scale-90" : ""
                }`}
              >
                Save
              </span>
            </div>
          </div>
        </div>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 3. Pick a skill and ask
// ---------------------------------------------------------------------------

const ASK_MARKS = [300, 1300, 2300, 4000, 5600] as const;

export function AskStage() {
  const p = usePhase(ASK_MARKS, 2400);
  const question = "Is a heat pump worth it for a small apartment?";
  const typed = useTyped(question, p === 3, 34);
  const skill = p >= 2 ? "research" : "chat";

  return (
    <Frame title="OmniDesk (example)">
      <div className="flex h-full flex-col bg-[#121212] p-4">
        <div className="flex-1 space-y-3 overflow-hidden">
          {p >= 4 && (
            <div className="pop-in flex justify-end">
              <div className="max-w-[80%] rounded-2xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-[11px] text-white">
                {question}
              </div>
            </div>
          )}
          {p === 4 && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-white/50">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[8px] font-bold text-black">OD</span>
              thinking<span className="dots" />
            </div>
          )}
          {p >= 5 && (
            <div className="pop-in flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white text-[8px] font-bold text-black">OD</span>
              <div className="min-w-0 text-[11px] leading-5 text-white/85">
                <p>It depends on your power price and how cold winters get. The usual way to check:</p>
                <ul className="mt-1 list-disc pl-4 text-white/70">
                  <li>Compare cost per unit of heat</li>
                  <li>Check local rebates</li>
                </ul>
                <div className="mt-2 flex gap-1.5">
                  {["example.org", "example.com"].map((s, i) => (
                    <span key={s} className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/70">
                      <span className="text-white/40">{i + 1}</span>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-1 overflow-hidden font-mono text-[9px]">
            {SKILLS.map((s) => (
              <span
                key={s.id}
                className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-bold transition-all duration-500 ${
                  s.id === skill ? "border-white bg-white text-black" : "border-white/15 text-white/45"
                }`}
              >
                {s.name}
              </span>
            ))}
          </div>
          <div className="rounded-xl border border-white/15 bg-[#181818] p-2.5">
            <div className="min-h-[18px] text-[11px] text-white">
              {p === 3 ? (
                <>
                  {typed}
                  <span className="caret" />
                </>
              ) : (
                <span className="text-white/30">Ask OmniDesk</span>
              )}
            </div>
            <div className="mt-2 flex gap-1 font-mono text-[9px]">
              {[
                { name: "Search", on: p >= 2 },
                { name: "Think", on: p >= 2 },
                { name: "Run code", on: false },
              ].map((t) => (
                <span
                  key={t.name}
                  className={`rounded border px-1.5 py-0.5 font-bold transition-all duration-500 ${
                    t.on ? "border-white bg-white text-black" : "border-white/15 text-white/40"
                  }`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 4. Summon it from anywhere (used in the hero too)
// ---------------------------------------------------------------------------

const DESKTOP_MARKS = [500, 1300, 2500, 4300, 5500] as const;

export function DesktopDemo({ height = "h-[340px]" }: { height?: string }) {
  const p = usePhase(DESKTOP_MARKS, 3200);
  const typed = useTyped("Summarize this contract clause", p >= 3, 42);

  return (
    <div className={`relative ${height} overflow-hidden rounded-2xl border border-ink/80 bg-gradient-to-br from-[#1f2d2b] via-[#151d26] to-[#2c1d14] shadow-[0_32px_60px_-28px_rgba(22,19,14,0.65)]`}>
      <div className="absolute -left-10 top-16 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
      <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-mark/15 blur-3xl" />

      <div className="relative flex h-6 items-center gap-4 bg-black/30 px-3 font-mono text-[9px] text-white/60 backdrop-blur">
        <span className="font-bold text-white/80">OmniDesk</span>
        <span>File</span>
        <span>Edit</span>
        <span>Window</span>
      </div>

      <div className="absolute left-6 top-12 w-[58%] rounded-lg border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
        <div className="h-2 w-1/2 rounded bg-white/25" />
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full rounded bg-white/10" />
          <div className="h-1.5 w-11/12 rounded bg-white/10" />
          <div className="h-1.5 w-5/6 rounded bg-white/10" />
          <div className="h-1.5 w-2/3 rounded bg-white/10" />
        </div>
      </div>

      <div
        className={`absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 font-mono text-[10px] text-white/70 transition-opacity duration-300 ${
          p >= 1 && p < 3 ? "opacity-100" : "opacity-0"
        }`}
      >
        <kbd className="rounded-md border border-white/25 bg-white/10 px-2.5 py-1">Option</kbd>
        <span>+</span>
        <kbd className="rounded-md border border-white/25 bg-white/10 px-2.5 py-1">/</kbd>
      </div>

      <div
        className={`absolute right-3 top-9 overflow-hidden rounded-xl border border-white/15 bg-[#0e0d14]/95 shadow-2xl transition-all duration-500 ${
          p < 2 ? "scale-75 opacity-0" : "opacity-100"
        } ${p >= 3 ? "w-[78%] max-w-[300px]" : "w-11"}`}
      >
        <div className={`flex h-11 items-center gap-2 ${p >= 3 ? "pl-3 pr-1.5" : "px-1.5"}`}>
          {p >= 3 && (
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/80">
              {typed}
              {p < 4 && <span className="caret" />}
            </span>
          )}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black">
            <Logo className="h-5 w-5" />
          </span>
        </div>
        {p >= 4 && (
          <div className="border-t border-white/10 px-3 py-2.5 text-[11px] leading-5 text-white/80">
            {p === 4 ? (
              <span className="font-mono text-white/50">
                thinking<span className="dots" />
              </span>
            ) : (
              <span className="pop-in block">
                This clause says either side can end the deal with 30 days notice, in writing.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SummonStage() {
  return <DesktopDemo />;
}

// ---------------------------------------------------------------------------
// 5. Teach it your writing style
// ---------------------------------------------------------------------------

const STYLE_MARKS = [300, 2600, 3300, 3900, 4500] as const;

export function StyleStage() {
  const p = usePhase(STYLE_MARKS, 2800);
  const typed = useTyped("Hey Sam, thanks for the quick turnaround. Can we sync Thursday?", p >= 1, 34);
  const bullets = ["Short, friendly sentences", "Greets people by first name", "Ends with a clear question"];

  return (
    <Frame title="OmniDesk: Your writing style (example)">
      <div className="h-full bg-[#121212] p-5">
        <div className="text-[10px] uppercase tracking-wider text-white/45">Sample of your writing</div>
        <div className="mt-1.5 min-h-[64px] rounded-lg border border-white/15 bg-[#1a1a1a] px-3 py-2 font-mono text-[11px] leading-5 text-white">
          {typed || <span className="text-white/30">Paste an email you wrote</span>}
          {p >= 1 && p < 2 && <span className="caret" />}
        </div>
        <div className="mt-3 flex justify-end">
          <span
            className={`rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-black transition-transform ${
              p === 2 ? "scale-90" : ""
            }`}
          >
            Learn my style
          </span>
        </div>

        {p >= 3 && (
          <div className="pop-in mt-4 rounded-lg border border-[#2a3a2a] bg-[#0e140e] p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#7fae7f]">Learned style profile</div>
            <ul className="mt-2 space-y-1.5 text-[11px] text-[#ccddcc]">
              {bullets.map((b, i) =>
                p >= 3 + i ? (
                  <li key={b} className="pop-in flex items-center gap-2">
                    <span className="text-[#7fae7f]">
                      <Check />
                    </span>
                    {b}
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}
      </div>
    </Frame>
  );
}
