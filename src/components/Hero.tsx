import { SKILLS, type SkillId, type ToolId } from "../models/skills";

const TOOL_LABEL: Record<ToolId, string> = { search: "Search", think: "Think", code: "Run code" };

/** The empty chat screen: pick a skill to begin. */
export function Hero({
  hasKey,
  onConnect,
  onPick,
}: {
  hasKey: boolean;
  onConnect: () => void;
  onPick: (skill: SkillId) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-4 pt-6 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-ink p-3 text-cream shadow-2xl">
        <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </svg>
      </div>

      <div>
        <h2 className="font-display text-4xl text-ink sm:text-5xl">OmniDesk</h2>
        <p className="mx-auto mt-3 max-w-md font-mono text-xs leading-relaxed text-[#6a6255]">
          One AI, seven skills. Pick a skill below to see what it does, then ask anything.
        </p>
      </div>

      {!hasKey && (
        <button
          onClick={onConnect}
          className="mx-auto flex items-center gap-3 rounded-xl border border-[#dcd2bf] bg-[#fbf8f1] px-4 py-3 text-left transition-all hover:border-ink"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-cream">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </span>
          <span>
            <span className="block text-xs font-bold text-ink">Add your free Gemini key to begin</span>
            <span className="block font-mono text-[11px] text-[#6a6255]">Takes about a minute. Click to connect.</span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {SKILLS.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="group rounded-xl border border-[#dcd2bf] bg-[#fbf8f1] p-3.5 text-left shadow-md transition-all duration-200 hover:border-ink hover:bg-[#fbf8f1]"
          >
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 bg-ink" />
                <span className="uppercase tracking-wider">{s.name}</span>
              </span>
              <span className="flex gap-1">
                {(Object.keys(s.tools) as ToolId[])
                  .filter((t) => s.tools[t])
                  .map((t) => (
                    <span
                      key={t}
                      className="rounded border border-[#bfb4a0] px-1 py-0.5 font-mono text-[9px] text-[#6a6255] group-hover:border-ink group-hover:text-ink"
                    >
                      {TOOL_LABEL[t]}
                    </span>
                  ))}
              </span>
            </div>
            <p className="text-xs leading-snug text-[#4d473d]">{s.summary}</p>
            <span className="mt-2 block font-mono text-[10px] text-[#8a8272] group-hover:text-ink">
              Try it: {s.starter.length > 70 ? s.starter.slice(0, 68) + "..." : s.starter}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
