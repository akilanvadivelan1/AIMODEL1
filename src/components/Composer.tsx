import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../models/types";
import { getSkill, MODELS, type Prefs, type SkillId, type ToolId } from "../models/skills";
import { SkillBar } from "./SkillBar";
import { TabPicker } from "./TabPicker";
import { hostOf, tabKey, tabsSupported, type BrowserTab } from "../lib/tabs";

interface Props {
  prefs: Prefs;
  onSkill: (id: SkillId) => void;
  onToggleTool: (tool: ToolId) => void;
  onSend: (text: string, attachments: Attachment[], tabs: BrowserTab[]) => void;
  disabled?: boolean;
  /** Put this text in the box (used when the user picks a starter). */
  draft?: { text: string; nonce: number } | null;
}

/** File types Gemini can read inline. */
const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
const MAX_TOTAL_BYTES = 18 * 1024 * 1024; // Gemini limits the whole request

const TOOLS: { id: ToolId; label: string; title: string }[] = [
  { id: "search", label: "Search", title: "Search the web with Google and show the sources" },
  { id: "think", label: "Think", title: "Let Gemini reason before it answers. Slower, better on hard problems" },
  { id: "code", label: "Run code", title: "Let Gemini write and run Python for exact math and data. Cannot be used with Search" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string).split(",")[1]) ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Composer({ prefs, onSkill, onToggleTool, onSend, disabled, draft }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState("");
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // A starter was picked: put it in the box and focus.
  useEffect(() => {
    if (!draft) return;
    setText(draft.text);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 140) + "px";
    });
  }, [draft]);

  function submit() {
    const t = text.trim();
    if ((!t && attachments.length === 0 && tabs.length === 0) || disabled) return;
    onSend(t, attachments, tabs);
    setText("");
    setAttachments([]);
    setTabs([]);
    setFileError("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setFileError("");
    let total = attachments.reduce((n, a) => n + Math.floor((a.data.length * 3) / 4), 0);
    const next: Attachment[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" is too large (the limit is 15 MB per file).`);
        continue;
      }
      if (total + file.size > MAX_TOTAL_BYTES) {
        setFileError("That is too much to send at once. Remove a file or send fewer.");
        continue;
      }
      try {
        const data = await fileToBase64(file);
        total += file.size;
        next.push({
          id: Math.random().toString(36).slice(2, 10),
          name: file.name || "pasted-image.png",
          mimeType: file.type || "application/octet-stream",
          data,
          isImage: file.type.startsWith("image/"),
        });
      } catch {
        setFileError(`Could not read "${file.name}".`);
      }
    }
    setAttachments((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  const skill = getSkill(prefs.skill);
  const modelName = MODELS.find((m) => m.id === prefs.model)?.name ?? prefs.model;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#f4efe4] via-[#f4efe4]/95 to-transparent p-4">
      <div className="mx-auto max-w-3xl space-y-2">
        <SkillBar value={prefs.skill} onChange={onSkill} />

        <div className="rounded-2xl border border-[#dcd2bf] bg-[#fbf8f1] p-2.5 shadow-2xl transition-all focus-within:border-ink">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 px-1">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-[#dcd2bf] bg-[#ece5d6] py-1 pl-1 pr-2"
                >
                  {a.isImage ? (
                    <img src={`data:${a.mimeType};base64,${a.data}`} alt={a.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-[#e6ddca] text-[#4d473d]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h10l6 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                      </svg>
                    </span>
                  )}
                  <span className="max-w-[120px] truncate font-mono text-[10px] text-[#2e2a23]">{a.name}</span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    className="text-[#756d5f] hover:text-ink"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {tabs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 px-1">
              {tabs.map((t, i) => (
                <span
                  key={tabKey(t)}
                  title={t.url}
                  className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-ink bg-[#ece5d6] py-1 pl-2.5 pr-1.5 font-mono text-[10px] text-[#2e2a23]"
                >
                  <span className="text-[#756d5f]">{i + 1}</span>
                  <span className="truncate">{t.title || hostOf(t.url)}</span>
                  <button
                    onClick={() => setTabs((prev) => prev.filter((x) => tabKey(x) !== tabKey(t)))}
                    className="text-[#756d5f] hover:text-ink"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {fileError && <div className="mb-2 px-1 font-mono text-[10px] text-[#b3321a]">{fileError}</div>}

          <textarea
            ref={ref}
            rows={1}
            value={text}
            disabled={disabled}
            placeholder={`Ask OmniDesk. ${skill.tagline}. Paste or attach images with +`}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              // Pasting a screenshot attaches it.
              const files = Array.from(e.clipboardData.files);
              if (files.length > 0) {
                e.preventDefault();
                void addFiles(files);
              }
            }}
            className="max-h-36 w-full resize-none bg-transparent px-3 py-1.5 text-[13px] text-ink placeholder-[#8a8272] outline-none disabled:opacity-50 sm:text-sm"
          />

          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center space-x-1.5 overflow-x-auto font-mono text-[10px]">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => void addFiles(Array.from(e.target.files ?? []))}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                title="Attach images, screenshots, PDFs, or text files"
                className="rounded-md p-1.5 text-[#6a6255] transition-colors hover:bg-[#dcd2bf] hover:text-ink disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {tabsSupported && (
                <button
                  onClick={() => setPickerOpen(true)}
                  disabled={disabled}
                  title="Ask about tabs you have open in your browser"
                  aria-pressed={tabs.length > 0}
                  className={[
                    "whitespace-nowrap rounded border px-2 py-0.5 font-bold transition-all disabled:opacity-40",
                    tabs.length > 0
                      ? "border-ink bg-ink text-cream"
                      : "border-[#dcd2bf] bg-transparent text-[#756d5f] hover:border-[#756d5f] hover:text-ink",
                  ].join(" ")}
                >
                  Tabs{tabs.length > 0 ? ` (${tabs.length})` : ""}
                </button>
              )}
              <div className="mx-0.5 h-3 w-px bg-[#dcd2bf]" />
              {TOOLS.map((t) => {
                const on = prefs[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => onToggleTool(t.id)}
                    title={t.title}
                    aria-pressed={on}
                    className={[
                      "whitespace-nowrap rounded border px-2 py-0.5 font-bold transition-all",
                      on
                        ? "border-ink bg-ink text-cream"
                        : "border-[#dcd2bf] bg-transparent text-[#756d5f] hover:border-[#756d5f] hover:text-ink",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={disabled || (!text.trim() && attachments.length === 0 && tabs.length === 0)}
              aria-label="Send"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-cream shadow-md transition-all hover:bg-[#2e2a23] active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] tracking-wide text-[#9a9283]">
          {skill.name} on {modelName}. Runs on Google Gemini with your own key.
        </p>
      </div>
      <TabPicker open={pickerOpen} selected={tabs} onClose={() => setPickerOpen(false)} onDone={setTabs} />
    </div>
  );
}
