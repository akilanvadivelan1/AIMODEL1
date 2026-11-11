import { useEffect, useMemo, useRef, useState } from "react";
import type { Attachment, ChatMessage, Conversation } from "./models/types";
import { ask } from "./models/ask";
import { GeminiError } from "./models/gemini";
import { getSkill, type Prefs, type SkillId, type ToolId } from "./models/skills";
import { loadPrefs, normalizePrefs, savePrefs, withSkill, withToolToggled } from "./models/prefs";
import { getApiKey } from "./models/apiKey";
import { getStyleProfile } from "./models/styleProfile";
import { Sidebar } from "./components/Sidebar";
import { ModelPicker } from "./components/ModelPicker";
import { MessageBubble } from "./components/MessageBubble";
import { Composer } from "./components/Composer";
import { Hero } from "./components/Hero";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { StyleModal } from "./components/StyleModal";
import { AccountModal } from "./components/AccountModal";
import {
  api,
  backendEnabled,
  BackendError,
  clearToken,
  getToken,
  isTauri,
  type BackendUser,
} from "./lib/backend";
import { openExternal, SITE_URL } from "./lib/external";
import { pullSettings, resetSync, schedulePush } from "./lib/sync";

const STORAGE_KEY = "omniminds.conversations.v1";
/** How many earlier messages are sent along with a question. */
const HISTORY_LIMIT = 20;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Reads saved chats, including ones saved by older versions of the app. */
function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Array<Record<string, any>>;
    return list.map((c) => ({
      ...(c as unknown as Conversation),
      messages: (c.messages ?? []).map((m: Record<string, any>) => {
        // Older versions kept the answer inside a "turn" object.
        if (m.role === "assistant" && m.turn) {
          const { turn, ...rest } = m;
          return { ...rest, content: m.content || turn.unified || "" } as ChatMessage;
        }
        return m as ChatMessage;
      }),
    }));
  } catch {
    return [];
  }
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(load);
  const [activeId, setActiveId] = useState<string | null>(() => load()[0]?.id ?? null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [draft, setDraft] = useState<{ text: string; nonce: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  // The landing page's Sign in link opens the app with the sign-in window ready.
  const [accountOpen, setAccountOpen] = useState(() => window.location.hash === "#/app/signin");
  const [user, setUser] = useState<BackendUser | null>(null);
  const [hasStyle, setHasStyle] = useState(() => !!getStyleProfile());
  const [hasKey, setHasKey] = useState(() => !!getApiKey());
  const [busyMsgId, setBusyMsgId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // Save chats. Attachment contents are large, so only their names are kept.
  useEffect(() => {
    const slim = conversations.map((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.attachments
          ? { ...m, attachments: m.attachments.map((a) => ({ ...a, data: "" })) }
          : m
      ),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      /* storage is full: skip saving this time */
    }
  }, [conversations]);

  // Tidy the address once the sign-in window has opened from the landing page.
  useEffect(() => {
    if (window.location.hash === "#/app/signin") {
      window.history.replaceState(null, "", "#/app");
    }
  }, []);

  // Remember the skill, model and tools, and sync them to the account if signed in.
  useEffect(() => {
    savePrefs(prefs);
    schedulePush();
  }, [prefs]);

  // If a session was saved from last time, restore it and pull the settings.
  useEffect(() => {
    if (!backendEnabled || !getToken()) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        setUser(me.user);
        await applyServerSettings();
      } catch (e) {
        if (e instanceof BackendError && e.status === 401) {
          clearToken();
          resetSync();
          if (!cancelled) setUser(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyServerSettings() {
    const server = await pullSettings();
    const fromServer = normalizePrefs(server.selection);
    if (fromServer) setPrefs(fromServer);
    setHasKey(!!getApiKey());
    setHasStyle(!!getStyleProfile());
  }

  async function handleSignedIn(u: BackendUser) {
    setUser(u);
    try {
      await applyServerSettings();
    } catch {
      /* settings will sync on the next change */
    }
  }

  // Follow the conversation as it grows. The empty screen stays at the top.
  useEffect(() => {
    if (!active || active.messages.length === 0) {
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, active?.id, busyMsgId]);

  function patch(id: string, fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  function newConversation(): string {
    const conv: Conversation = { id: uid(), title: "New chat", messages: [], createdAt: Date.now() };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }

  function pickSkill(id: SkillId) {
    setPrefs((p) => withSkill(p, id));
  }

  /** Choosing a skill on the empty screen also drops an example into the box. */
  function pickStarter(id: SkillId) {
    pickSkill(id);
    setDraft({ text: getSkill(id).starter, nonce: Date.now() });
  }

  async function handleSend(text: string, attachments: Attachment[] = []) {
    if (busyMsgId) return;

    let convId = activeId;
    if (!convId || !conversations.some((c) => c.id === convId)) convId = newConversation();

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      attachments: attachments.length ? attachments : undefined,
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "", createdAt: Date.now() };

    // Only send real answers back to Gemini as history, never error messages.
    const history = (conversations.find((c) => c.id === convId)?.messages ?? [])
      .filter((m) => m.content.trim() && !m.error)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));

    patch(convId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFrom(text || "Attachment") : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));
    setBusyMsgId(assistantMsg.id);

    const controller = new AbortController();
    abortRef.current = controller;
    const id = convId;
    const used = prefs;

    const finish = (change: Partial<ChatMessage>) =>
      patch(id, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, ...change } : m)),
      }));

    try {
      const res = await ask({ prompt: text, history, prefs: used, attachments, signal: controller.signal });
      finish({
        content: res.text,
        sources: res.sources.length ? res.sources : undefined,
        searchHtml: res.searchEntryPoint,
        truncated: res.truncated || undefined,
        meta: { model: res.model, skill: used.skill },
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Stopped by the user: drop the empty answer.
        patch(id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== assistantMsg.id) }));
      } else {
        finish({
          content: err instanceof GeminiError ? err.message : "Something went wrong. Please try again.",
          error: true,
        });
      }
    } finally {
      setBusyMsgId(null);
      abortRef.current = null;
    }
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
      />

      <main className="relative flex h-screen flex-1 flex-col overflow-hidden bg-[#f4efe4]">
        <header className="z-20 flex h-14 items-center justify-between border-b border-[#e6ddca] bg-[#f4efe4]/95 px-4 backdrop-blur">
          <div className="flex items-center space-x-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Show the sidebar"
                className="rounded-lg p-1.5 text-[#6a6255] transition-colors hover:bg-[#fbf8f1] hover:text-ink"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            {isTauri ? (
              // The Mac app has no landing page of its own, so open the website in the browser.
              <button
                onClick={() => openExternal(SITE_URL)}
                title="Open the OmniDesk website"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-2.5 py-1.5 font-mono text-xs text-[#5f584d] transition-all hover:border-ink hover:text-ink"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Website</span>
              </button>
            ) : (
              <a
                href="#/"
                title="Back to the OmniDesk website"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-2.5 py-1.5 font-mono text-xs text-[#5f584d] transition-all hover:border-ink hover:text-ink"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Site</span>
              </a>
            )}
            <ModelPicker value={prefs.model} onChange={(model) => setPrefs((p) => ({ ...p, model }))} />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAccountOpen(true)}
              title={
                user
                  ? `Signed in as ${user.email}`
                  : backendEnabled
                    ? "Sign in to sync your settings"
                    : "Sign in (accounts are not switched on yet)"
              }
              className={[
                "flex items-center space-x-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-all",
                user
                  ? "border-[#b7d0b4] bg-[#e8f1e6] text-[#2f6b3a] hover:border-ink"
                  : "border-[#dcd2bf] bg-[#fbf8f1] text-[#2e2a23] hover:border-ink hover:bg-ink hover:text-cream",
              ].join(" ")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hidden sm:inline">{user ? "Synced" : "Sign in"}</span>
            </button>
            <button
              onClick={() => setStyleOpen(true)}
              title="Teach OmniDesk your writing style"
              className={[
                "flex items-center space-x-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-all",
                hasStyle
                  ? "border-[#b7d0b4] bg-[#e8f1e6] text-[#2f6b3a] hover:border-ink"
                  : "border-[#dcd2bf] bg-[#fbf8f1] text-[#2e2a23] hover:border-ink hover:bg-ink hover:text-cream",
              ].join(" ")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span className="hidden lg:inline">{hasStyle ? "My style" : "Teach style"}</span>
            </button>
            <button
              onClick={() => setKeyModalOpen(true)}
              title={hasKey ? "Gemini key saved. Click to change it" : "Add your Gemini key"}
              className={[
                "flex items-center space-x-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-all",
                hasKey
                  ? "border-ink bg-ink text-cream"
                  : "border-[#dcd2bf] bg-[#fbf8f1] text-[#2e2a23] hover:border-ink hover:bg-ink hover:text-cream",
              ].join(" ")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <span className="hidden sm:inline">{hasKey ? "Connected" : "Connect"}</span>
            </button>
            {busyMsgId ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="rounded-lg border border-[#dcd2bf] px-3 py-1.5 font-mono text-xs text-[#2e2a23] hover:bg-[#fbf8f1]"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => active && deleteConversation(active.id)}
                title="Delete this chat"
                className="rounded-lg border border-transparent p-1.5 text-[#6a6255] transition-all hover:border-[#dcd2bf] hover:bg-[#fbf8f1] hover:text-ink"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {!active || active.messages.length === 0 ? (
            <div className="pb-44">
              <Hero hasKey={hasKey} onConnect={() => setKeyModalOpen(true)} onPick={pickStarter} />
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 pb-44">
              {active.messages.map((m) => (
                <MessageBubble key={m.id} message={m} thinking={m.id === busyMsgId && !m.content} />
              ))}
            </div>
          )}
        </div>

        <Composer
          prefs={prefs}
          onSkill={pickSkill}
          onToggleTool={(tool: ToolId) => setPrefs((p) => withToolToggled(p, tool))}
          onSend={handleSend}
          disabled={!!busyMsgId}
          draft={draft}
        />
      </main>

      <ApiKeyModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onSaved={() => {
          setHasKey(!!getApiKey());
          schedulePush();
        }}
      />
      <StyleModal
        open={styleOpen}
        onClose={() => setStyleOpen(false)}
        onSaved={() => {
          setHasStyle(!!getStyleProfile());
          schedulePush();
        }}
      />
      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={user}
        onSignedIn={handleSignedIn}
        onSignedOut={() => setUser(null)}
      />
    </div>
  );
}

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 39) + "..." : t;
}
