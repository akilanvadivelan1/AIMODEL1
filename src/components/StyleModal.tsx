import { useEffect, useState } from "react";
import {
  analyzeAndSaveStyle,
  clearStyleProfile,
  getStyleProfile,
} from "../models/styleProfile";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function StyleModal({ open, onClose, onSaved }: Props) {
  const [sample, setSample] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const p = getStyleProfile();
      setSample(p?.sample ?? "");
      setDescription(p?.description ?? "");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const profile = await analyzeAndSaveStyle(sample);
      setDescription(profile.description);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    clearStyleProfile();
    setSample("");
    setDescription("");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6ddca] bg-[#ece5d6] px-5 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              Your Writing Style
            </h3>
            <p className="text-[11px] text-[#6a6255]">
              Paste a sample of your writing. OmniDesk learns your voice and writes like you.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6a6255] transition-colors hover:bg-[#e6ddca] hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#5f584d]">
              Sample email or message
            </label>
            <textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              rows={8}
              placeholder={
                "Paste a full email or two that you wrote. The more natural and complete, the better it learns your voice."
              }
              className="w-full resize-y rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 leading-relaxed text-ink placeholder-[#9a9283] outline-none focus:border-ink"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-[#e8bfb3] bg-[#fbe9e3] px-3 py-2 text-[#b3321a]">
              {error}
            </div>
          )}

          {description && (
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#2f6b3a]">
                Learned style profile
              </label>
              <div className="whitespace-pre-wrap rounded-lg border border-[#b7d0b4] bg-[#e8f1e6] px-3 py-2.5 leading-relaxed text-[#2e2a23]">
                {description}
              </div>
            </div>
          )}

          <p className="border-t border-[#e6ddca] pt-3 text-[10px] leading-relaxed text-[#8a8272]">
            Saved on this device. If you are signed in, it also syncs to your account.
            Once saved, ask OmniDesk to "write an email to..." and it will match your
            voice.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-[#e6ddca] bg-[#ece5d6] px-5 py-3 text-xs">
          <button
            onClick={reset}
            className="text-[11px] text-[#756d5f] hover:text-ink"
          >
            Clear style
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#dcd2bf] px-3 py-1.5 text-[#2e2a23] hover:bg-[#fbf8f1]"
            >
              Close
            </button>
            <button
              onClick={analyze}
              disabled={busy || sample.trim().length < 20}
              className="rounded-lg bg-ink px-4 py-1.5 font-bold text-cream transition-colors hover:bg-[#3a342a] disabled:opacity-40"
            >
              {busy ? "Learning…" : description ? "Re-learn style" : "Learn my style"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
