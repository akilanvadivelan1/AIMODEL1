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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#333333] bg-[#121212] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#252525] bg-[#0a0a0a] px-5 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Your Writing Style
            </h3>
            <p className="text-[11px] text-[#888888]">
              Paste a sample of your writing. OmniDesk learns your voice and writes like you.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#888888] transition-colors hover:bg-[#222222] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#999999]">
              Sample email or message
            </label>
            <textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              rows={8}
              placeholder={
                "Paste a full email or two that you wrote. The more natural and complete, the better it learns your voice."
              }
              className="w-full resize-y rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 leading-relaxed text-white placeholder-[#555555] outline-none focus:border-white"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-[#5a2a2a] bg-[#1e1212] px-3 py-2 text-[#e59b9b]">
              {error}
            </div>
          )}

          {description && (
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-[#7fae7f]">
                Learned style profile
              </label>
              <div className="whitespace-pre-wrap rounded-lg border border-[#2a3a2a] bg-[#0e140e] px-3 py-2.5 leading-relaxed text-[#ccddcc]">
                {description}
              </div>
            </div>
          )}

          <p className="border-t border-[#222222] pt-3 text-[10px] leading-relaxed text-[#666666]">
            Stored only in this browser. Once saved, ask OmniDesk to "write an email
            to..." and it will match your voice.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-[#252525] bg-[#0a0a0a] px-5 py-3 text-xs">
          <button
            onClick={reset}
            className="text-[11px] text-[#777777] hover:text-white"
          >
            Clear style
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#333333] px-3 py-1.5 text-[#cccccc] hover:bg-[#1a1a1a]"
            >
              Close
            </button>
            <button
              onClick={analyze}
              disabled={busy || sample.trim().length < 20}
              className="rounded-lg bg-white px-4 py-1.5 font-bold text-black transition-colors hover:bg-[#d4d4d4] disabled:opacity-40"
            >
              {busy ? "Learning…" : description ? "Re-learn style" : "Learn my style"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
