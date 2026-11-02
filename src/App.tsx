import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Conversation, ModelId } from "./models/types";
import { sendMessage } from "./models/provider";
import { MODELS } from "./models/registry";
import { Sidebar } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import { MessageBubble } from "./components/MessageBubble";

const STORAGE_KEY = "mmc.conversations.v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(
    () => loadConversations()[0]?.id ?? null
  );
  const [model, setModel] = useState<ModelId>("claude");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // Persist to localStorage.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages, streamingId]);

  function newConversation(): string {
    const conv: Conversation = {
      id: uid(),
      title: "New chat",
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((cur) => {
      if (cur !== id) return cur;
      const rest = conversations.filter((c) => c.id !== id);
      return rest[0]?.id ?? null;
    });
  }

  function patchConversation(id: string, fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  async function handleSend(text: string) {
    let convId = activeId;
    if (!convId) convId = newConversation();

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      model,
      createdAt: Date.now(),
    };

    patchConversation(convId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFrom(text) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));
    setStreamingId(assistantMsg.id);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history = (conversations.find((c) => c.id === convId)?.messages ?? [])
        .concat(userMsg);

      await sendMessage({
        model,
        messages: history,
        signal: controller.signal,
        onToken: (chunk) => {
          patchConversation(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
            ),
          }));
        },
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        patchConversation(convId!, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: m.content + "\n\n[error generating response]" }
              : m
          ),
        }));
      }
    } finally {
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex h-full bg-slate-100 text-slate-900">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
      />

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold">Multi-Model Chat</h1>
            <p className="text-xs text-slate-400">
              Claude · Gemini · ChatGPT · Kiro — each routed to its strengths
            </p>
          </div>
          {streamingId && (
            <button
              type="button"
              onClick={stopStreaming}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Stop
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {!active || active.messages.length === 0 ? (
              <EmptyState model={model} />
            ) : (
              active.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  streaming={m.id === streamingId}
                />
              ))
            )}
          </div>
        </div>

        <Composer
          model={model}
          onModelChange={setModel}
          onSend={handleSend}
          disabled={!!streamingId}
        />
      </main>
    </div>
  );
}

function EmptyState({ model }: { model: ModelId }) {
  const info = MODELS[model];
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h2 className="text-lg font-semibold text-slate-700">
        Start a conversation
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Currently routing to{" "}
        <span className={`font-medium ${info.accentText}`}>{info.name}</span>.
        Pick a different model below the input anytime.
      </p>
      <ul className="mt-4 space-y-1 text-left text-sm text-slate-500">
        {info.strengths.map((s) => (
          <li key={s} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${info.accent}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 39) + "…" : t;
}
