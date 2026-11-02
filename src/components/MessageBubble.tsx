import type { ChatMessage, StageOutput, ViewMode } from "../models/types";
import { MODELS } from "../models/registry";

export function MessageBubble({
  message,
  viewMode,
  streaming,
}: {
  message: ChatMessage;
  viewMode: ViewMode;
  streaming?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl border border-[#333333] bg-[#1a1a1a] px-4 py-3 font-mono text-xs leading-relaxed text-white shadow-lg sm:text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const turn = message.turn;
  return (
    <div className="flex items-start space-x-3 text-xs sm:text-sm">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-black">
        OM
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {/* Participant badges */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
          {(turn?.participants ?? []).map((m) => (
            <span
              key={m}
              className="rounded border border-[#444444] bg-[#161616] px-2 py-0.5 text-white"
            >
              [{MODELS[m].short}]
            </span>
          ))}
          {streaming && (
            <span className="pulse-mono rounded border border-[#444444] bg-[#161616] px-2 py-0.5 text-[#aaaaaa]">
              orchestrating…
            </span>
          )}
        </div>

        {/* Content */}
        {viewMode === "pipeline" || !turn ? (
          <div className="space-y-3">
            {(turn?.stages ?? []).map((s) => (
              <StageCard key={s.model} stage={s} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 whitespace-pre-wrap text-[13px] leading-7 text-[#e3e3e3] sm:text-sm">
              {turn.unified.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {turn.participants.length > 1 && (
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#666666]">
                <span>Synthesized across {turn.participants.length} models</span>
                <span className="text-[#444444]">·</span>
                <span className="text-[#888888]">
                  switch to Pipeline View to see each stage
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StageCard({ stage }: { stage: StageOutput }) {
  const info = MODELS[stage.model];
  return (
    <div className="space-y-2 rounded-xl border border-[#262626] bg-[#141414] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-white font-mono text-[10px] font-bold text-black">
            {info.stage}
          </span>
          <span className="font-mono text-xs font-bold uppercase text-white">
            Stage {info.stage}: {info.stageLabel}
          </span>
        </div>
        <span className="rounded border border-[#383838] px-1 font-mono text-[9px] text-[#888888]">
          {info.badge}
        </span>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-[#262626] bg-[#0b0b0b] p-3 font-mono text-[11px] leading-relaxed text-[#cccccc]">
        {stage.content}
      </pre>
    </div>
  );
}
