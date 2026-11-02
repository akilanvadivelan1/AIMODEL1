import { useEffect, useState } from "react";
import { getApiKey, setApiKey } from "../models/apiKey";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ApiKeyModal({ open, onClose, onSaved }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(getApiKey());
  }, [open]);

  if (!open) return null;

  function save() {
    setApiKey(value);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#333333] bg-[#121212] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#252525] bg-[#0a0a0a] px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Connect a Real Model
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#888888] transition-colors hover:bg-[#222222] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <p className="leading-relaxed text-[#b3b3b3]">
            Paste a free <strong className="text-white">Google Gemini API key</strong> to
            get real answers. It is stored only in this browser (localStorage) and
            never sent anywhere except directly to Google.
          </p>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[#cccccc] underline decoration-[#444444] underline-offset-2 hover:text-white"
          >
            Get a free key at aistudio.google.com ↗
          </a>

          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-white placeholder-[#555555] outline-none focus:border-white"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                setApiKey("");
                setValue("");
                onSaved();
              }}
              className="text-[11px] text-[#777777] hover:text-white"
            >
              Clear key
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-[#333333] px-3 py-1.5 text-[#cccccc] hover:bg-[#1a1a1a]"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-white px-4 py-1.5 font-bold text-black transition-colors hover:bg-[#d4d4d4]"
              >
                Save
              </button>
            </div>
          </div>

          <p className="border-t border-[#222222] pt-3 text-[10px] leading-relaxed text-[#666666]">
            Note: this is a public site, so a key here is visible to anyone using
            this browser profile. Fine for a personal tool. For a shared app we would
            move the key behind a backend.
          </p>
        </div>
      </div>
    </div>
  );
}
