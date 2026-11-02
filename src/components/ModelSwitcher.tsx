import { useEffect, useRef, useState } from "react";
import type { RouteMode } from "../models/types";
import { MODEL_LIST } from "../models/registry";

interface Props {
  value: RouteMode;
  onChange: (mode: RouteMode) => void;
}

const QUAD_DESC = "Kiro (Spec) ➔ Gemini (Search) ➔ Claude (Reason) ➔ ChatGPT (Run)";

function label(mode: RouteMode): string {
  if (mode === "quad") return "Quad-Synergy 4-in-1";
  return MODEL_LIST.find((m) => m.id === mode)!.name;
}

export function ModelSwitcher({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function pick(mode: RouteMode) {
    onChange(mode);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center space-x-2 rounded-lg border border-[#2f2f2f] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#252525]"
      >
        <span className="h-2 w-2 rounded-full bg-white" />
        <span>{label(value)}</span>
        <svg className="h-3.5 w-3.5 text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 space-y-1 rounded-xl border border-[#333333] bg-[#141414] p-1.5 shadow-2xl">
          <button
            onClick={() => pick("quad")}
            className={[
              "group block w-full rounded-lg border p-2.5 text-left transition-all hover:bg-white hover:text-black",
              value === "quad"
                ? "border-white bg-[#1c1c1c]"
                : "border-[#2b2b2b] bg-[#1c1c1c]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white group-hover:text-black">
                Quad-Synergy (Full Orchestration)
              </div>
              <span className="rounded border border-[#444444] px-1 font-mono text-[9px] group-hover:border-black">
                DEFAULT
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-[#888888] group-hover:text-[#222222]">
              {QUAD_DESC}
            </div>
          </button>

          {MODEL_LIST.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className={[
                "group block w-full rounded-lg p-2.5 text-left transition-all hover:bg-white hover:text-black",
                value === m.id ? "bg-[#1c1c1c]" : "",
              ].join(" ")}
            >
              <div className="text-xs font-bold text-white group-hover:text-black">
                {m.name}
              </div>
              <div className="text-[10px] text-[#888888] group-hover:text-[#222222]">
                {m.tagline}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
