import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { loadPrefs } from "../models/prefs";
import {
  AUTO_CHECKPOINT,
  AgentError,
  MAX_STEPS,
  describe,
  isRisky,
  planStep,
  refusal,
  type AgentAction,
} from "../models/agent";
import { captureScreen, endTask, perform, type TaskPayload } from "../lib/computer";

/**
 * The see-through layer drawn over the whole screen while the AI works.
 * It also runs the loop: look at the screen, ask Gemini what to do, show it, do it.
 * It never takes clicks or focus, so the app being controlled keeps both.
 */

type Decision = "approve" | "skip" | "stop";

interface Card {
  n: number;
  status: string;
  intent: string;
  waiting: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function Overlay() {
  const [active, setActive] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [card, setCard] = useState<Card>({ n: 0, status: "", intent: "", waiting: false });
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [ripple, setRipple] = useState(0);

  const stopped = useRef(false);
  const decide = useRef<((d: Decision) => void) | null>(null);
  const abort = useRef<AbortController | null>(null);
  const running = useRef(false);

  useEffect(() => {
    const offs: Array<Promise<() => void>> = [
      listen("agent-approve", () => decide.current?.("approve")),
      listen("agent-skip", () => decide.current?.("skip")),
      listen("agent-stop", () => {
        stopped.current = true;
        abort.current?.abort();
        decide.current?.("stop");
      }),
      listen<TaskPayload>("agent-task", (e) => void run(e.payload)),
    ];
    return () => {
      offs.forEach((p) => p.then((off) => off()).catch(() => undefined));
    };
    // The listeners are set up once and use refs for everything that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function waitForDecision(): Promise<Decision> {
    return new Promise((resolve) => {
      decide.current = (d) => {
        decide.current = null;
        resolve(d);
      };
    });
  }

  async function run(t: TaskPayload) {
    if (running.current) return;
    running.current = true;
    stopped.current = false;
    setActive(true);
    setPointer(null);

    const log: string[] = [];
    const model = loadPrefs().model;
    let summary = "";
    let success = false;
    let autoStreak = 0;
    let failures = 0;

    // Screen positions on the 0 to 1000 grid become pixels inside this window.
    const toPx = (x: number, y: number) => ({
      x: (x / 1000) * t.screenW - t.originX,
      y: (y / 1000) * t.screenH - t.originY,
    });

    try {
      for (let n = 1; n <= MAX_STEPS && !stopped.current; n++) {
        setCard({ n, status: "Looking at the screen", intent: "", waiting: false });
        // Everything we draw is hidden for the screenshot so the AI only sees the real screen.
        setHidden(true);
        await sleep(200);
        const shot = await captureScreen();
        setHidden(false);
        if (stopped.current) break;

        setCard({ n, status: "Thinking", intent: "", waiting: false });
        abort.current = new AbortController();
        const step = await planStep({ task: t.task, history: log, image: shot.image, model, signal: abort.current.signal });
        if (stopped.current) break;

        if (step.type === "done") {
          summary = step.summary;
          success = step.success;
          break;
        }
        if (step.type === "ask") {
          summary = step.question;
          success = false;
          log.push(`Stopped to ask you: ${step.question}`);
          break;
        }
        if (step.type === "wait") {
          const text = describe(step);
          setCard({ n, status: "Waiting", intent: step.intent, waiting: false });
          await sleep(step.seconds * 1000);
          log.push(text);
          continue;
        }

        const text = describe(step);
        const why = refusal(step);
        if (why) {
          setCard({ n, status: "Not allowed", intent: why, waiting: false });
          log.push(`Refused: ${text}. ${why}`);
          await sleep(1500);
          continue;
        }

        const a: AgentAction = step.action;
        if (a.kind === "click" || a.kind === "scroll") setPointer(toPx(a.x, a.y));

        const needsApproval = t.mode === "ask" || isRisky(step) || autoStreak >= AUTO_CHECKPOINT;
        if (needsApproval) {
          setCard({ n, status: "Waiting for you", intent: text, waiting: true });
          const d = await waitForDecision();
          if (d === "stop" || stopped.current) break;
          if (d === "skip") {
            log.push(`You skipped: ${text}`);
            autoStreak = 0;
            continue;
          }
          autoStreak = 0;
        } else {
          autoStreak++;
        }

        setCard({ n, status: "Doing it", intent: text, waiting: false });
        if (a.kind === "click") setRipple((r) => r + 1);
        try {
          await perform(a);
          failures = 0;
          log.push(text);
        } catch (e) {
          // The Mac refused or the action failed. Tell Gemini so it can try another way.
          if (stopped.current) break;
          failures++;
          const reason = (e as Error).message;
          log.push(`Failed: ${text}. ${reason}`);
          if (failures >= 3) {
            summary = `I could not do that. ${reason}`;
            break;
          }
        }
        await sleep(900);
      }

      if (!summary) {
        summary = stopped.current
          ? "You stopped the task."
          : `I stopped after ${MAX_STEPS} steps without finishing. You can start again and I will pick up from the screen.`;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        summary = "You stopped the task.";
      } else {
        summary = e instanceof AgentError || e instanceof Error ? e.message : "Something went wrong.";
      }
      success = false;
    } finally {
      setActive(false);
      setHidden(false);
      setPointer(null);
      decide.current = null;
      abort.current = null;
      running.current = false;
      await endTask({ task: t.task, summary, success, steps: log });
    }
  }

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 select-none" style={{ opacity: hidden ? 0 : 1 }}>
      {/* A thin orange frame tells you the AI is in control. */}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 3px #d4430f, inset 0 0 40px rgba(212,67,15,0.25)" }} />

      {pointer && (
        <div
          className="absolute left-0 top-0"
          style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)`, transition: "transform 650ms cubic-bezier(.2,.8,.2,1)" }}
        >
          {ripple > 0 && (
            <span key={ripple} className="ghost-ripple absolute -left-4 -top-4 h-8 w-8 rounded-full border-2 border-accent" />
          )}
          <svg width="30" height="30" viewBox="0 0 24 24" className="drop-shadow-lg" style={{ marginLeft: -3, marginTop: -2 }}>
            <path d="M4 2l15 9.2-6.4 1.5 3.7 6.8-2.9 1.6-3.7-6.8L5 18.6z" fill="#d4430f" stroke="#fbf8f1" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 w-[480px] -translate-x-1/2 rounded-2xl border border-ink bg-cream p-4 font-mono shadow-2xl">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted">
          <span>OmniDesk is using your screen</span>
          <span>
            Step {card.n} of {MAX_STEPS}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-ink">
          <span className={card.waiting ? "h-2 w-2 rounded-full bg-accent" : "pulse-mono h-2 w-2 rounded-full bg-accent"} />
          {card.status}
        </div>
        {card.intent && <p className="mt-1 text-[12px] leading-relaxed text-[#2e2a23]">{card.intent}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-[10px] text-muted">
          {card.waiting && (
            <>
              <span>
                <b className="text-ink">Option + Return</b> do it
              </span>
              <span>
                <b className="text-ink">Option + Delete</b> skip
              </span>
            </>
          )}
          <span>
            <b className="text-ink">Option + Esc</b> stop
          </span>
        </div>
      </div>
    </div>
  );
}
