import { useCallback, useEffect, useState } from "react";
import { getPermissions, openPrivacySettings, requestPermissions, startTask, type Permissions, type RunMode } from "../lib/computer";
import { getApiKey } from "../models/apiKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onNeedKey: () => void;
}

/** Forgets the permissions macOS saved for older copies of OmniDesk. */
const RESET_COMMAND =
  "tccutil reset ScreenCapture com.omnidesk.app; tccutil reset Accessibility com.omnidesk.app";

const EXAMPLES = [
  "Open Notes and write a shopping list: milk, eggs, bread",
  "Open Safari and search for the weather in Seattle",
  "In Finder, make a new folder on the Desktop called Taxes 2026",
];

function Row({ ok, title, help, onOpen }: { ok: boolean; title: string; help: string; onOpen: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#e6ddca] bg-[#fbf8f1] p-3">
      <span
        className={[
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          ok ? "bg-[#2f6b3a] text-cream" : "bg-[#b3321a] text-cream",
        ].join(" ")}
      >
        {ok ? "\u2713" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold text-ink">{title}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-[#5f584d]">{help}</div>
      </div>
      {!ok && (
        <button
          onClick={onOpen}
          className="shrink-0 rounded-lg border border-[#dcd2bf] bg-[#f4efe4] px-2.5 py-1 text-[11px] font-bold text-[#4d473d] transition-colors hover:border-ink hover:text-ink"
        >
          Open settings
        </button>
      )}
    </div>
  );
}

export function ControlModal({ open, onClose, onNeedKey }: Props) {
  const [perms, setPerms] = useState<Permissions | null>(null);
  const [task, setTask] = useState("");
  const [mode, setMode] = useState<RunMode>("ask");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    try {
      setPerms(await getPermissions());
    } catch {
      setPerms({ screen: false, accessibility: false });
    }
  }, []);

  // Look again every couple of seconds so the checkmarks turn green after the user flips a switch.
  useEffect(() => {
    if (!open) return;
    setError("");
    void check();
    const t = setInterval(() => void check(), 2000);
    return () => clearInterval(t);
  }, [open, check]);

  if (!open) return null;

  const ready = !!perms && perms.screen && perms.accessibility;

  async function openPane(pane: "screen" | "accessibility") {
    // Asking first puts OmniDesk in the list, so there is a switch to turn on.
    await requestPermissions();
    await openPrivacySettings(pane);
  }

  async function copyReset() {
    try {
      await navigator.clipboard.writeText(RESET_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  async function start() {
    setError("");
    if (!getApiKey()) {
      onClose();
      onNeedKey();
      return;
    }
    setStarting(true);
    try {
      // A task copied from an old report starts with "Screen task:". Drop that label.
      await startTask(task.trim().replace(/^screen task:\s*/i, ""), mode);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6ddca] bg-[#ece5d6] px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Let OmniDesk use your screen</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[#6a6255] transition-colors hover:bg-[#e6ddca] hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5 text-xs">
          <p className="leading-relaxed text-[#4d473d]">
            Say you want a shopping list in Notes. Tell OmniDesk, and a glowing pointer moves to each spot, then clicks
            and types for you. You approve every step, and you can stop at any moment.
          </p>

          <div className="space-y-2">
            <Row
              ok={!!perms?.screen}
              title="Screen Recording"
              help="So OmniDesk can see the screen. After you turn it on, quit and reopen OmniDesk."
              onOpen={() => void openPane("screen")}
            />
            <Row
              ok={!!perms?.accessibility}
              title="Accessibility"
              help="So OmniDesk can move the pointer, click and type."
              onOpen={() => void openPane("accessibility")}
            />
          </div>

          {perms && !ready && (
            <details className="rounded-lg border border-[#e6ddca] bg-[#ece5d6] p-3 text-[11px] leading-relaxed text-[#4d473d]">
              <summary className="cursor-pointer font-bold text-ink">Switch is on but this is still red?</summary>
              <p className="mt-2">
                macOS is remembering an older copy of OmniDesk. Every new version counts as a new app, so the old
                switch does not apply. To clear it:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Copy this command and paste it in Terminal, then press Return.</li>
              </ol>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded border border-[#dcd2bf] bg-[#fbf8f1] px-2 py-1 text-[10px] text-ink">
                  {RESET_COMMAND}
                </code>
                <button
                  onClick={() => void copyReset()}
                  className="shrink-0 rounded border border-[#dcd2bf] bg-[#fbf8f1] px-2 py-1 text-[10px] font-bold text-[#4d473d] hover:border-ink hover:text-ink"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <ol start={2} className="mt-2 list-decimal space-y-1 pl-4">
                <li>Quit OmniDesk and open it again.</li>
                <li>Press Open settings above, then turn on the new OmniDesk switch.</li>
                <li>For Screen Recording, quit and reopen OmniDesk once more.</li>
              </ol>
            </details>
          )}

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#756d5f]">
              What should it do?
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder={EXAMPLES[0]}
              className="w-full resize-none rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 text-ink outline-none placeholder:text-[#8a8272] focus:border-ink"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTask(ex)}
                  className="rounded-full border border-[#dcd2bf] px-2.5 py-1 text-left text-[10px] text-[#5f584d] transition-colors hover:border-ink hover:text-ink"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {(
              [
                ["ask", "Ask me before every action", "Recommended. You press Option + Return for each step."],
                ["auto", "Run on its own", "It still asks before sending, buying, deleting or sharing, and every 8 steps."],
              ] as const
            ).map(([id, label, help]) => (
              <label
                key={id}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  mode === id ? "border-ink bg-[#fbf8f1]" : "border-[#e6ddca] hover:border-[#bfb4a0]",
                ].join(" ")}
              >
                <input type="radio" name="mode" checked={mode === id} onChange={() => setMode(id)} className="mt-0.5 accent-[#16130e]" />
                <span>
                  <span className="block text-[12px] font-bold text-ink">{label}</span>
                  <span className="block text-[11px] leading-relaxed text-[#5f584d]">{help}</span>
                </span>
              </label>
            ))}
          </div>

          <ul className="space-y-1 rounded-lg border border-[#e6ddca] bg-[#ece5d6] p-3 text-[11px] leading-relaxed text-[#4d473d]">
            <li>Your Mac pointer will move by itself. Do not touch the mouse while it works.</li>
            <li>
              <b className="text-ink">Option + Esc</b> stops it right away, at any time.
            </li>
            <li>It sends screenshots to Google Gemini with your key. Close anything private first.</li>
            <li>It never types passwords or card numbers. It stops and asks you to do that part.</li>
          </ul>

          {error && <div className="rounded-lg border border-[#e8bfb3] bg-[#fbe9e3] p-3 leading-relaxed text-[#b3321a]">{error}</div>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#e6ddca] bg-[#ece5d6] px-5 py-3 text-xs">
          <span className="text-[#756d5f]">{ready ? "Ready" : "Turn on both switches to start"}</span>
          <button
            onClick={() => void start()}
            disabled={!ready || !task.trim() || starting}
            className="rounded-lg bg-ink px-4 py-1.5 font-bold text-cream transition-colors hover:bg-[#3a342a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {starting ? "Starting..." : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
