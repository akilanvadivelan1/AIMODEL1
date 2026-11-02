import { useRef, useState } from "react";

export type CapabilityKey = "ears" | "grounding" | "thinking" | "sandbox";

interface Props {
  capabilities: Record<CapabilityKey, boolean>;
  onToggleCapability: (key: CapabilityKey) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
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
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#121212] via-[#121212]/95 to-transparent p-4">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="rounded-2xl border border-[#2e2e2e] bg-[#181818] p-2.5 shadow-2xl transition-all focus-within:border-white">
          <textarea
            ref={ref}
            rows={1}
            value={text}
            disabled={disabled}
            placeholder="Direct OmniMinds (Claude, Gemini, ChatGPT, Kiro synchronized)..."
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
              <button
                title="Attach codebase or document (Gemini 2M context)"
                className="rounded-md p-1.5 text-[#888888] transition-colors hover:bg-[#292929] hover:text-white"
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
              disabled={disabled || !text.trim()}
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
