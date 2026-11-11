import { useState } from "react";
import type { ChatMessage } from "../models/types";
import { getSkill } from "../models/skills";
import { ExternalLink } from "./ExternalLink";
import { Markdown } from "./Markdown";

export function MessageBubble({
  message,
  thinking,
}: {
  message: ChatMessage;
  /** True while this message is waiting for Gemini. */
  thinking: boolean;
}) {
  const [copied, setCopied] = useState(false);

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
                    className="h-24 w-24 rounded-lg border border-[#dcd2bf] object-cover"
                  />
                ) : (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2"
                  >
                    <svg className="h-4 w-4 text-[#4d473d]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h10l6 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                    <span className="max-w-[160px] truncate font-mono text-[11px] text-[#2e2a23]">{a.name}</span>
                  </div>
                )
              )}
            </div>
          )}
          {message.tabs && message.tabs.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {message.tabs.map((t, i) => (
                <span
                  key={i}
                  title={t.url}
                  className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-[#dcd2bf] bg-[#ece5d6] px-2.5 py-1 font-mono text-[10px] text-[#2e2a23]"
                >
                  <span className="text-[#756d5f]">{i + 1}</span>
                  <span className="truncate">{t.title || t.url}</span>
                </span>
              ))}
            </div>
          )}
          {message.content && (
            <div className="whitespace-pre-wrap rounded-2xl border border-[#dcd2bf] bg-[#fbf8f1] px-4 py-3 text-[13px] leading-relaxed text-ink shadow-lg sm:text-sm">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  const sources = message.sources ?? [];

  return (
    <div className="flex items-start space-x-3 text-xs sm:text-sm">
      <div
        className={[
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-cream",
          thinking ? "pulse-mono" : "",
        ].join(" ")}
      >
        OD
      </div>

      <div className="min-w-0 flex-1">
        {thinking && (
          <div className="flex items-center gap-1 pt-1 font-mono text-[13px] text-[#6a6255]">
            <span>thinking</span>
            <span className="thinking-dots" />
          </div>
        )}

        {message.content && message.error && (
          <div className="rounded-xl border border-[#e8bfb3] bg-[#fbe9e3] px-4 py-3 text-[13px] leading-relaxed text-[#b3321a]">
            {message.content}
          </div>
        )}

        {message.content && !message.error && <Markdown>{message.content}</Markdown>}

        {message.truncated && !message.error && (
          <p className="mt-2 font-mono text-[11px] text-[#8a6d1a]">
            This answer hit the length limit. Ask me to continue and I will pick up where it stopped.
          </p>
        )}

        {sources.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-[#8a8272]">
              Sources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s, i) => (
                <ExternalLink
                  key={s.url}
                  href={s.url}
                  title={s.title}
                  className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-[#dcd2bf] bg-[#fbf8f1] px-2.5 py-1 font-mono text-[11px] text-[#2e2a23] transition-colors hover:border-ink hover:text-ink"
                >
                  <span className="text-[#756d5f]">{i + 1}</span>
                  <span className="truncate">{s.title}</span>
                </ExternalLink>
              ))}
            </div>
          </div>
        )}

        {message.searchHtml && (
          // Google asks that these search suggestions are shown with grounded answers.
          <iframe
            title="Google Search suggestions"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={message.searchHtml}
            className="mt-3 h-14 w-full rounded-lg border-0"
          />
        )}

        {message.content && !thinking && !message.error && (
          <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-[#8a8272]">
            <button onClick={copy} className="transition-colors hover:text-ink">
              {copied ? "Copied" : "Copy"}
            </button>
            {message.meta && (
              <span>
                {getSkill(message.meta.skill).name} / {message.meta.model}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
