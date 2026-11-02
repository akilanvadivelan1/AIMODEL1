import { MODEL_LIST } from "../models/registry";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StrengthsModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#333333] bg-[#121212] font-mono shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252525] bg-[#0a0a0a] px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-black">
              OM
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Transferable Model Strengths Matrix
              </h3>
              <p className="text-[11px] text-[#888888]">
                The four superpowers fused into your OmniMinds chatbot.
              </p>
            </div>
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

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-[#2e2e2e] text-xs">
            <div className="grid grid-cols-4 border-b border-[#2e2e2e] bg-[#1a1a1a] p-2.5 font-bold text-white">
              <div>MODEL</div>
              <div>TRANSFERABLE SUPERPOWER</div>
              <div>ROLE</div>
              <div>MECHANISM</div>
            </div>
            {MODEL_LIST.map((m, i) => (
              <div
                key={m.id}
                className={[
                  "grid grid-cols-4 p-2.5 text-[#cccccc]",
                  i < MODEL_LIST.length - 1 ? "border-b border-[#222222]" : "",
                  i % 2 === 0 ? "bg-[#121212]" : "bg-[#141414]",
                ].join(" ")}
              >
                <div className="font-bold text-white">
                  {m.stage}. {m.short.toUpperCase()}
                </div>
                <div>{m.superpower}</div>
                <div>{m.role}</div>
                <div>{m.mechanism}</div>
              </div>
            ))}
          </div>

          {/* Detail cards */}
          <div className="grid grid-cols-1 gap-3.5 text-xs md:grid-cols-2">
            {MODEL_LIST.map((m) => (
              <div
                key={m.id}
                className="space-y-2 rounded-xl border border-[#2b2b2b] bg-[#161616] p-3.5"
              >
                <div className="flex items-center justify-between border-b border-[#222222] pb-1.5">
                  <span className="font-bold text-white">
                    [0{m.stage}] {m.short.toUpperCase()}
                  </span>
                  <span className="rounded border border-[#444444] px-1 text-[9px] text-[#aaaaaa]">
                    {m.badge}
                  </span>
                </div>
                <p className="text-[#cccccc]">
                  <strong className="text-white">Core skill:</strong> {m.superpower}.
                </p>
                <ul className="space-y-0.5 text-[11px] text-[#888888]">
                  {m.strengths.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#252525] bg-[#0a0a0a] px-6 py-3 text-xs">
          <span className="text-[#666666]">
            4 autonomous skills fused in a single pipeline.
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-4 py-1.5 font-bold text-black transition-colors hover:bg-[#d4d4d4]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
