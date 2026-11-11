import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "../models/ask";
import { GeminiError } from "../models/gemini";
import { getApiKey } from "../models/apiKey";
import { loadPrefs } from "../models/prefs";
import { Markdown } from "../components/Markdown";

/**
 * The floating quick-search widget for the Mac app.
 *
 * Option + / shows a small OmniDesk logo in the top right corner of the screen.
 * Hovering the logo opens a search bar. Type, press Enter, and the answer shows
 * underneath. Escape closes it.
 *
 * The native window is resized by Rust to match this page, so the size of the
 * root element below decides the size of the window.
 */

type Turn = { role: "user" | "assistant"; content: string };

const NO_KEY_MESSAGE =
  "Add your Gemini key first. Open OmniDesk, click Connect, and paste your key.";

function tell(command: string, args?: Record<string, unknown>) {
  invoke(command, args).catch(() => {
    /* not running inside the Mac app, or the window is closing */
  });
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
}

export function Widget() {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Turn[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const idle = !text && !busy && !answer;

  // While there is something to keep, clicking another app must not hide us.
  const sticky = !idle;
  useEffect(() => {
    tell("set_widget_sticky", { sticky });
  }, [sticky]);

  // Keep the native window exactly as big as this page's content.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      tell("resize_widget", {
        width: Math.ceil(r.width),
        height: Math.ceil(r.height),
      });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When the search bar opens, put the cursor in it.
  useEffect(() => {
    if (!expanded) return;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [expanded]);

  // Rust fires this event each time the shortcut shows the widget.
  useEffect(() => {
    const onSummon = () => {
      if (expanded) inputRef.current?.focus();
    };
    window.addEventListener("omnidesk-summon", onSummon);
    return () => window.removeEventListener("omnidesk-summon", onSummon);
  }, [expanded]);

  function reset() {
    abortRef.current?.abort();
    setText("");
    setQuestion("");
    setAnswer("");
    setHistory([]);
    setBusy(false);
    setExpanded(false);
  }

  // Escape: clear and shrink to the logo. Escape again: hide the widget.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (expanded || !idle) reset();
      else tell("hide_widget");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function submit() {
    const prompt = text.trim();
    if (!prompt || busy) return;

    setText("");
    setQuestion(prompt);
    setAnswer("");

    if (!getApiKey()) {
      setAnswer(NO_KEY_MESSAGE);
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await ask({
        prompt,
        history,
        prefs: loadPrefs(),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setAnswer(res.text);
      setHistory((h) => [
        ...h,
        { role: "user", content: prompt },
        { role: "assistant", content: res.text },
      ]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setAnswer(e instanceof GeminiError ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-start justify-end overflow-hidden">
      <div
        ref={rootRef}
        onMouseLeave={() => {
          if (expanded && idle) setExpanded(false);
        }}
        className={expanded ? "w-[460px]" : "h-14 w-14"}
      >
        {expanded ? (
          <div className="overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] text-ink">
            <div className="flex h-14 items-center gap-2 pl-4 pr-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Ask OmniDesk anything"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-[#8a8272]"
              />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-cream">
                <LogoMark className="h-6 w-6" />
              </div>
            </div>

            {(busy || answer || question) && (
              <div className="max-h-[320px] overflow-y-auto border-t border-[#e6ddca] px-4 py-3">
                {question && (
                  <p className="mb-2 font-mono text-[11px] text-[#756d5f]">{question}</p>
                )}
                {busy ? (
                  <div className="flex items-center gap-1 font-mono text-[13px] text-[#6a6255]">
                    <span>thinking</span>
                    <span className="thinking-dots" />
                  </div>
                ) : (
                  <Markdown>{answer}</Markdown>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => tell("open_main_window")}
                    className="font-mono text-[10px] text-[#8a8272] transition-colors hover:text-ink"
                  >
                    Open OmniDesk
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onMouseEnter={() => setExpanded(true)}
            onClick={() => setExpanded(true)}
            aria-label="Open OmniDesk search"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-cream"
          >
            <LogoMark className="h-8 w-8" />
          </button>
        )}
      </div>
    </div>
  );
}
