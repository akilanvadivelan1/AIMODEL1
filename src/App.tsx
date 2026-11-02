import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AssistantTurn,
  ChatMessage,
  Conversation,
  RouteMode,
  StageOutput,
  ViewMode,
} from "./models/types";
import { orchestrate } from "./models/orchestrator";
import { Sidebar } from "./components/Sidebar";
import { ModelSwitcher } from "./components/ModelSwitcher";
import { ViewToggle } from "./components/ViewToggle";
import { StrengthsModal } from "./components/StrengthsModal";
import { MessageBubble } from "./components/MessageBubble";
import { Composer, type CapabilityKey } from "./components/Composer";
import { Hero } from "./components/Hero";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { getApiKey } from "./models/apiKey";

const STORAGE_KEY = "omniminds.conversations.v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(load);
  const [activeId, setActiveId] = useState<string | null>(() => load()[0]?.id ?? null);
  const [mode, setMode] = useState<RouteMode>("quad");
  const [viewMode, setViewMode] = useState<ViewMode>("unified");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState(() => !!getApiKey());
  const [busyMsgId, setBusyMsgId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Record<CapabilityKey, boolean>>({
    ears: true,
    grounding: true,
    thinking: true,
    sandbox: true,
  });

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, busyMsgId]);

  function patch(id: string, fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  function newConversation(): string {
    const conv: Conversation = {
      id: uid(),
      title: "New session",
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }

  async function handleSend(text: string) {
    let convId = activeId;
    if (!convId || !conversations.some((c) => c.id === convId)) {
      convId = newConversation();
    }

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
      turn: { stages: [], unified: "", participants: [] },
      createdAt: Date.now(),
    };

    patch(convId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFrom(text) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));
    setBusyMsgId(assistantMsg.id);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const priorMessages =
        conversations.find((c) => c.id === convId)?.messages ?? [];
      const history = priorMessages
        .filter((m) => m.role === "user" || (m.turn?.unified?.trim()?.length ?? 0) > 0)
        .map((m) => ({
          role: m.role,
          content: m.role === "assistant" ? m.turn!.unified : m.content,
        }));

      const result: AssistantTurn = await orchestrate({
        mode,
        prompt: text,
        history,
        signal: controller.signal,
        onStage: (stage: StageOutput) => {
          patch(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    turn: {
                      ...(m.turn ?? { stages: [], unified: "", participants: [] }),
                      stages: [...(m.turn?.stages ?? []), stage],
                      participants: [...(m.turn?.participants ?? []), stage.model],
                    },
                  }
                : m
            ),
          }));
        },
      });

      patch(convId!, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, turn: result } : m
        ),
      }));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        patch(convId!, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  turn: {
                    stages: m.turn?.stages ?? [],
                    unified: "[error generating response]",
                    participants: m.turn?.participants ?? [],
                  },
                }
              : m
          ),
        }));
      }
    } finally {
      setBusyMsgId(null);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function toggleCapability(key: CapabilityKey) {
    setCapabilities((c) => ({ ...c, [key]: !c[key] }));
  }

  return (
    <div className="noir-texture flex min-h-screen text-sm antialiased">
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
        onToggle={() => setSidebarOpen((o) => !o)}
        onOpenMatrix={() => setMatrixOpen(true)}
      />

      <main className="relative flex h-screen flex-1 flex-col overflow-hidden bg-[#121212]">
        {/* Header */}
        <header className="z-20 flex h-14 items-center justify-between border-b border-[#222222] bg-[#121212]/95 px-4 backdrop-blur">
          <div className="flex items-center space-x-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Toggle sidebar"
                className="rounded-lg p-1.5 text-[#888888] transition-colors hover:bg-[#1c1c1c] hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <ModelSwitcher value={mode} onChange={setMode} />
          </div>

          <ViewToggle value={viewMode} onChange={setViewMode} />

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setKeyModalOpen(true)}
              title={hasKey ? "Gemini connected — manage key" : "Connect a real model (API key)"}
              className={[
                "flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-all",
                hasKey
                  ? "border-white bg-white text-black"
                  : "border-[#2b2b2b] bg-[#1a1a1a] text-[#cccccc] hover:border-white hover:bg-white hover:text-black",
              ].join(" ")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <span className="hidden md:inline">{hasKey ? "Connected" : "Connect"}</span>
            </button>
            <button
              onClick={() => setMatrixOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg border border-[#2b2b2b] bg-[#1a1a1a] px-2.5 py-1.5 font-mono text-xs text-[#cccccc] transition-all hover:border-white hover:bg-white hover:text-black"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="hidden md:inline">Strengths</span>
            </button>
            {busyMsgId ? (
              <button
                onClick={stop}
                className="rounded-lg border border-[#333333] px-3 py-1.5 font-mono text-xs text-[#cccccc] hover:bg-[#1a1a1a]"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => active && deleteConversation(active.id)}
                title="Clear current session"
                className="rounded-lg border border-transparent p-1.5 text-[#888888] transition-all hover:border-[#333333] hover:bg-[#1a1a1a] hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {!active || active.messages.length === 0 ? (
            <Hero onStarter={handleSend} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 pb-28">
              {active.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  viewMode={viewMode}
                  streaming={m.id === busyMsgId}
                />
              ))}
            </div>
          )}
        </div>

        <Composer
          capabilities={capabilities}
          onToggleCapability={toggleCapability}
          onSend={handleSend}
          disabled={!!busyMsgId}
        />
      </main>

      <StrengthsModal open={matrixOpen} onClose={() => setMatrixOpen(false)} />
      <ApiKeyModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onSaved={() => setHasKey(!!getApiKey())}
      />
    </div>
  );
}

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 39) + "…" : t;
}
