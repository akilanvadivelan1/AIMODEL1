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
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white p-3 text-black shadow-2xl">
        <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </svg>
      </div>

      <div>
        <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-white sm:text-2xl">OmniDesk</h2>
        <p className="mx-auto mt-2 max-w-md font-mono text-xs leading-relaxed text-[#888888]">
          One AI, seven skills. Pick a skill below to see what it does, then ask anything.
        </p>
      </div>

      {!hasKey && (
        <button
          onClick={onConnect}
          className="mx-auto flex items-center gap-3 rounded-xl border border-[#3a3a3a] bg-[#161616] px-4 py-3 text-left transition-all hover:border-white"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-black">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </span>
          <span>
            <span className="block text-xs font-bold text-white">Add your free Gemini key to begin</span>
            <span className="block font-mono text-[11px] text-[#888888]">Takes about a minute. Click to connect.</span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
        {SKILLS.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="group rounded-xl border border-[#282828] bg-[#171717] p-3.5 text-left shadow-md transition-all duration-200 hover:border-white hover:bg-[#202020]"
          >
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 bg-white" />
                <span className="uppercase tracking-wider">{s.name}</span>
              </span>
              <span className="flex gap-1">
                {(Object.keys(s.tools) as ToolId[])
                  .filter((t) => s.tools[t])
                  .map((t) => (
                    <span
                      key={t}
                      className="rounded border border-[#444444] px-1 py-0.5 font-mono text-[9px] text-[#888888] group-hover:border-white group-hover:text-white"
                    >
                      {TOOL_LABEL[t]}
                    </span>
                  ))}
              </span>
            </div>
            <p className="text-xs leading-snug text-[#b0b0b0]">{s.summary}</p>
            <span className="mt-2 block font-mono text-[10px] text-[#666666] group-hover:text-white">
              Try it: {s.starter.length > 70 ? s.starter.slice(0, 68) + "..." : s.starter}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
