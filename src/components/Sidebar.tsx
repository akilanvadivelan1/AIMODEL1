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
  onOpenMatrix: () => void;
}

export function Sidebar({
  open,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onToggle,
  onOpenMatrix,
}: Props) {
  const [filter, setFilter] = useState("");

  const visible = conversations.filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase().trim())
  );

  return (
    <aside
      className={[
        "flex h-screen w-64 shrink-0 flex-col justify-between border-r border-[#222222] bg-[#0d0d0d] transition-all duration-300 z-30",
        open ? "ml-0" : "-ml-64",
      ].join(" ")}
    >
      <div className="space-y-3 p-3.5">
        {/* Brand + collapse */}
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold tracking-tighter text-black">
              OM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                OmniMinds
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#777777]">
                Quad-Model Core
              </span>
            </div>
          </div>
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            className="rounded-md p-1 text-[#777777] transition-all hover:bg-[#1a1a1a] hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New session */}
        <button
          onClick={onNew}
          className="group flex w-full items-center justify-between rounded-lg border border-[#2e2e2e] bg-[#181818] px-3 py-2 text-xs font-semibold tracking-wide text-white transition-all duration-200 hover:border-white hover:bg-white hover:text-black"
        >
          <span className="flex items-center space-x-2">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Session</span>
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
            placeholder="Filter orchestrations..."
            className="w-full rounded-lg border border-[#222222] bg-[#141414] px-2.5 py-1.5 pl-7 text-xs text-white placeholder-[#555555] transition-all focus:border-[#555555] focus:outline-none"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#555555]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Strengths matrix trigger */}
        <button
          onClick={onOpenMatrix}
          className="flex w-full items-center justify-between rounded-lg border border-[#262626] bg-[#141414] px-2.5 py-1.5 font-mono text-xs text-[#b3b3b3] transition-all hover:bg-[#1f1f1f] hover:text-white"
        >
          <span className="flex items-center space-x-2">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Strengths Matrix</span>
          </span>
          <span className="rounded border border-[#3a3a3a] px-1 text-[9px] uppercase text-[#999999]">
            Inspect
          </span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 space-y-4 overflow-y-auto px-2 text-xs">
        <div>
          <div className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#555555]">
            Sessions
          </div>
          <div className="mt-1 space-y-0.5">
            {visible.length === 0 && (
              <p className="px-2.5 py-3 font-mono text-[10px] text-[#555555]">
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
                      ? "border border-[#2a2a2a] bg-[#1a1a1a] text-white"
                      : "text-[#999999] hover:bg-[#161616] hover:text-white",
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
                      className="hidden text-[#666666] hover:text-white group-hover:block"
                    >
                      ×
                    </button>
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        active ? "bg-white" : "bg-[#444444] group-hover:bg-white",
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
      <div className="space-y-2 border-t border-[#1f1f1f] bg-[#090909] p-3">
        <div className="flex items-center justify-between rounded-lg border border-[#222222] bg-[#121212] px-2.5 py-1.5 font-mono text-[10px]">
          <div className="flex items-center space-x-2">
            <span className="pulse-mono h-1.5 w-1.5 rounded-full bg-white" />
            <span className="uppercase tracking-wider text-[#cccccc]">
              Engine: Quad Active
            </span>
          </div>
          <span className="text-[#777777]">v2.4.0</span>
        </div>
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-[#181818]">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
              OP
            </div>
            <div>
              <div className="text-xs font-bold leading-tight text-white">Operator</div>
              <div className="font-mono text-[9px] text-[#777777]">Noir Workspace</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
