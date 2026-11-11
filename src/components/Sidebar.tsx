import { useState } from "react";
import type { Conversation } from "../models/types";

interface Props {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
}

export function Sidebar({
  open,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onToggle,
}: Props) {
  const [filter, setFilter] = useState("");

  const visible = conversations.filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase().trim())
  );

  return (
    <aside
      className={[
        "flex h-screen w-64 shrink-0 flex-col justify-between border-r border-[#e6ddca] bg-[#ece5d6] transition-all duration-300 z-30",
        open ? "ml-0" : "-ml-64",
      ].join(" ")}
    >
      <div className="space-y-3 p-3.5">
        {/* Brand + collapse */}
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-xs font-bold tracking-tighter text-cream">OD</div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                OmniDesk
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#756d5f]">
                Powered by Gemini
              </span>
            </div>
          </div>
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="rounded-md p-1 text-[#756d5f] transition-all hover:bg-[#fbf8f1] hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New session */}
        <button
          onClick={onNew}
          className="group flex w-full items-center justify-between rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 text-xs font-semibold tracking-wide text-ink transition-all duration-200 hover:border-ink hover:bg-ink hover:text-cream"
        >
          <span className="flex items-center space-x-2">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New chat</span>
          </span>
          <span className="font-mono text-[9px] uppercase opacity-60 group-hover:opacity-100">
            ⌘K
          </span>
        </button>

        {/* Search */}
        <div className="relative">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search your chats..."
            className="w-full rounded-lg border border-[#e6ddca] bg-[#fbf8f1] px-2.5 py-1.5 pl-7 text-xs text-ink placeholder-[#9a9283] transition-all focus:border-[#9a9283] focus:outline-none"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#9a9283]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 space-y-4 overflow-y-auto px-2 text-xs">
        <div>
          <div className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#9a9283]">
            Sessions
          </div>
          <div className="mt-1 space-y-0.5">
            {visible.length === 0 && (
              <p className="px-2.5 py-3 font-mono text-[10px] text-[#9a9283]">
                No sessions yet.
              </p>
            )}
            {visible.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={[
                    "group flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 transition-all",
                    active
                      ? "border border-[#dcd2bf] bg-[#fbf8f1] text-ink"
                      : "text-[#5f584d] hover:bg-[#fbf8f1] hover:text-ink",
                  ].join(" ")}
                >
                  <span
                    onClick={() => onSelect(c.id)}
                    className="truncate pr-2"
                    title={c.title}
                  >
                    {c.title}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDelete(c.id)}
                      title="Delete"
                      className="hidden text-[#8a8272] hover:text-ink group-hover:block"
                    >
                      ×
                    </button>
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        active ? "bg-ink" : "bg-[#bfb4a0] group-hover:bg-ink",
                      ].join(" ")}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom capsule */}
      <div className="space-y-2 border-t border-[#e6ddca] bg-[#ece5d6] p-3">
        <div className="flex items-center justify-between rounded-lg border border-[#e6ddca] bg-[#f4efe4] px-2.5 py-1.5 font-mono text-[10px]">
          <div className="flex items-center space-x-2">
            <span className="pulse-mono h-1.5 w-1.5 rounded-full bg-ink" />
            <span className="uppercase tracking-wider text-[#2e2a23]">
              Engine: Gemini
            </span>
          </div>
          <span className="text-[#756d5f]">v3.0</span>
        </div>
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-[#fbf8f1]">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-cream">
              OP
            </div>
            <div>
              <div className="text-xs font-bold leading-tight text-ink">Operator</div>
              <div className="font-mono text-[9px] text-[#756d5f]">Your workspace</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
