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
        <div className="max-w-[85%] space-y-2">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((a) =>
                a.isImage && a.data ? (
                  <img
                    key={a.id}
                    src={`data:${a.mimeType};base64,${a.data}`}
                    alt={a.name}
                    className="h-24 w-24 rounded-lg border border-[#333333] object-cover"
                  />
                ) : (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-[#333333] bg-[#1a1a1a] px-3 py-2"
                  >
                    <svg className="h-4 w-4 text-[#aaaaaa]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h10l6 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                    <span className="max-w-[160px] truncate font-mono text-[11px] text-[#cccccc]">
                      {a.name}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
          {message.content && (
            <div className="whitespace-pre-wrap rounded-2xl border border-[#333333] bg-[#1a1a1a] px-4 py-3 font-mono text-xs leading-relaxed text-white shadow-lg sm:text-sm">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  const turn = message.turn;
  const hasAnswer = !!turn && turn.unified.trim().length > 0;

  return (
    <div className="flex items-start space-x-3 text-xs sm:text-sm">
      <div
        className={[
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-black",
          streaming ? "pulse-mono" : "",
        ].join(" ")}
      >
        OM
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {/* Thinking indicator: just logo + "…thinking" until the answer arrives */}
        {streaming && !hasAnswer && (
          <div className="flex items-center gap-1 pt-1 font-mono text-[13px] text-[#888888]">
            <span>thinking</span>
            <span className="thinking-dots" />
          </div>
        )}

        {/* Pipeline view (opt-in): show each model's stage */}
        {hasAnswer && viewMode === "pipeline" && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
              {turn!.participants.map((m) => (
                <span
                  key={m}
                  className="rounded border border-[#444444] bg-[#161616] px-2 py-0.5 text-white"
                >
                  [{MODELS[m].short}]
                </span>
              ))}
            </div>
            <div className="space-y-3">
              {turn!.stages.map((s) => (
                <StageCard key={s.model} stage={s} />
              ))}
            </div>
          </>
        )}

        {/* Unified view (default): a clean conversational paragraph answer */}
        {hasAnswer && viewMode === "unified" && (
          <div className="space-y-3">
            <div className="space-y-3 whitespace-pre-wrap text-[13px] leading-7 text-[#e3e3e3] sm:text-sm">
              {turn!.unified.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {turn!.participants.length > 1 && (
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#666666]">
                <span>Synthesized across {turn!.participants.length} models</span>
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
