import { useRef, useState } from "react";
import type { ModelId } from "../models/types";
import { ModelPicker } from "./ModelPicker";

interface Props {
  model: ModelId;
  onModelChange: (id: ModelId) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ model, onModelChange, onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-3xl space-y-2">
        <ModelPicker value={model} onChange={onModelChange} />
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-slate-300">
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            disabled={disabled}
            placeholder="Send a message…  (Enter to send, Shift+Enter for newline)"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
            }}
            onKeyDown={handleKeyDown}
            className="max-h-48 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
