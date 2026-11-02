import type { Conversation } from "../models/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          <span className="text-lg leading-none">+</span> New chat
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-slate-400">
            No conversations yet.
          </p>
        )}
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              className={[
                "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition",
                active
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className="flex-1 truncate text-left"
                title={c.title}
              >
                {c.title}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="hidden rounded px-1 text-slate-400 hover:text-red-500 group-hover:block"
                title="Delete conversation"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 p-3 text-[11px] leading-relaxed text-slate-400">
        Multi-Model Chat · mocked responses
      </div>
    </aside>
  );
}
