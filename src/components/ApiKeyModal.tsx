import { useEffect, useState } from "react";
import { getApiKey, setApiKey } from "../models/apiKey";
import { isTauri } from "../lib/backend";
import { openExternal } from "../lib/external";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6ddca] bg-[#ece5d6] px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
            Connect a Real Model
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6a6255] transition-colors hover:bg-[#e6ddca] hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <p className="leading-relaxed text-[#4d473d]">
            Paste a free <strong className="text-ink">Google Gemini API key</strong> to
            get real answers. It is saved on this device. Questions go straight from
            your device to Google. If you sign in to OmniDesk, the key is also stored
            encrypted on your account so it follows you to other devices.
          </p>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              // The Mac app cannot follow links by itself, so hand it to the browser.
              if (isTauri) {
                e.preventDefault();
                openExternal("https://aistudio.google.com/app/apikey");
              }
            }}
            className="inline-flex items-center gap-1.5 text-[#2e2a23] underline decoration-[#bfb4a0] underline-offset-2 hover:text-ink"
          >
            Get a free key at aistudio.google.com
          </a>

          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste your Gemini key (starts with AQ. or AIza)"
            className="w-full rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 text-ink placeholder-[#9a9283] outline-none focus:border-ink"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                setApiKey("");
                setValue("");
                onSaved();
              }}
              className="text-[11px] text-[#756d5f] hover:text-ink"
            >
              Clear key
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-[#dcd2bf] px-3 py-1.5 text-[#2e2a23] hover:bg-[#fbf8f1]"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-ink px-4 py-1.5 font-bold text-cream transition-colors hover:bg-[#3a342a]"
              >
                Save
              </button>
            </div>
          </div>

          <p className="border-t border-[#e6ddca] pt-3 text-[10px] leading-relaxed text-[#8a8272]">
            Note: anyone who uses this browser profile can use the saved key. Only
            save it on a device you trust.
          </p>
        </div>
      </div>
    </div>
  );
}
