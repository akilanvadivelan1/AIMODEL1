import { useRef, useState } from "react";
import type { Attachment } from "../models/types";

export type CapabilityKey = "ears" | "grounding" | "thinking" | "sandbox";

interface Props {
  capabilities: Record<CapabilityKey, boolean>;
  onToggleCapability: (key: CapabilityKey) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled?: boolean;
}

/** File types Gemini can read inline. */
const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:...;base64," prefix
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const PILLS: { key: CapabilityKey; label: string }[] = [
  { key: "ears", label: "[SDD SPEC]" },
  { key: "grounding", label: "[2M GROUND]" },
  { key: "thinking", label: "[<THINK>]" },
  { key: "sandbox", label: "[SANDBOX]" },
];

export function Composer({
  capabilities,
  onToggleCapability,
  onSend,
  disabled,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const t = text.trim();
    if ((!t && attachments.length === 0) || disabled) return;
    onSend(t, attachments);
    setText("");
    setAttachments([]);
    setFileError("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFileError("");
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" is too large (max 15 MB).`);
        continue;
      }
      try {
        const data = await fileToBase64(file);
        next.push({
          id: Math.random().toString(36).slice(2, 10),
          name: file.name,
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

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#121212] via-[#121212]/95 to-transparent p-4">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="rounded-2xl border border-[#2e2e2e] bg-[#181818] p-2.5 shadow-2xl transition-all focus-within:border-white">
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 px-1">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-[#333333] bg-[#111111] py-1 pl-1 pr-2"
                >
                  {a.isImage ? (
                    <img
                      src={`data:${a.mimeType};base64,${a.data}`}
                      alt={a.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-[#222222] text-[#aaaaaa]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h10l6 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                      </svg>
                    </span>
                  )}
                  <span className="max-w-[120px] truncate font-mono text-[10px] text-[#cccccc]">
                    {a.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="text-[#777777] hover:text-white"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {fileError && (
            <div className="mb-2 px-1 font-mono text-[10px] text-[#e59b9b]">{fileError}</div>
          )}

          <textarea
            ref={ref}
            rows={1}
            value={text}
            disabled={disabled}
            placeholder="Ask OmniDesk anything, or attach an image or document with +"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
            onKeyDown={onKeyDown}
            className="max-h-36 w-full resize-none bg-transparent px-3 py-1.5 font-mono text-xs text-white placeholder-[#666666] outline-none disabled:opacity-50 sm:text-sm"
          />

          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center space-x-1.5 overflow-x-auto font-mono text-[10px]">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                title="Attach images, screenshots, or documents"
                className="rounded-md p-1.5 text-[#888888] transition-colors hover:bg-[#292929] hover:text-white disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div className="mx-0.5 h-3 w-px bg-[#2f2f2f]" />
              {PILLS.map((p) => {
                const on = capabilities[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => onToggleCapability(p.key)}
                    className={[
                      "whitespace-nowrap rounded border px-2 py-0.5 font-bold transition-all",
                      on
                        ? "border-white bg-white text-black"
                        : "border-[#444444] bg-transparent text-[#666666] line-through",
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={disabled || (!text.trim() && attachments.length === 0)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md transition-all hover:bg-[#cccccc] active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] tracking-wide text-[#555555]">
          OMNIMINDS // SYNCHRONIZING CLAUDE 3.7 + GEMINI 2.5 + CHATGPT-4O + KIRO SDD
        </p>
      </div>
    </div>
  );
}
