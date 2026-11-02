import type { ChatMessage } from "../models/types";
import { ModelBadge } from "./ModelBadge";

export function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && message.model && (
          <div className="mb-1 flex items-center gap-2">
            <ModelBadge model={message.model} />
          </div>
        )}
        <div
          className={[
            "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-slate-900 text-white"
              : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200",
          ].join(" ")}
        >
          {message.content}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-slate-400 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
