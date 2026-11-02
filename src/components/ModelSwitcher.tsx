import { useEffect, useRef, useState } from "react";
import { PROVIDERS, getVariant } from "../models/catalog";

export type Selection = { kind: "quad" } | { kind: "single"; variantId: string };

interface Props {
  value: Selection;
  onChange: (sel: Selection) => void;
}

const QUAD_DESC = "Kiro (Spec) ➔ Gemini (Search) ➔ Claude (Reason) ➔ ChatGPT (Run)";

function label(sel: Selection): string {
  if (sel.kind === "quad") return "Quad-Synergy 4-in-1";
  return getVariant(sel.variantId).name;
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

  function pick(sel: Selection) {
    onChange(sel);
    setOpen(false);
  }

  const selectedVariant = value.kind === "single" ? value.variantId : null;

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
        <div className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-[#333333] bg-[#141414] p-1.5 shadow-2xl">
          {/* Quad option */}
          <button
            onClick={() => pick({ kind: "quad" })}
            className={[
              "group mb-1 block w-full rounded-lg border p-2.5 text-left transition-all hover:bg-white hover:text-black",
              value.kind === "quad" ? "border-white bg-[#1c1c1c]" : "border-[#2b2b2b] bg-[#1c1c1c]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white group-hover:text-black">
                Quad-Synergy (All 4)
              </div>
              <span className="rounded border border-[#444444] px-1 font-mono text-[9px] group-hover:border-black">
                DEFAULT
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-[#888888] group-hover:text-[#222222]">
              {QUAD_DESC}
            </div>
          </button>

          {/* Provider groups, each with its model variants */}
          {PROVIDERS.map((provider) => (
            <div key={provider.id} className="mb-1">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#666666]">
                  {provider.name}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-wider text-[#4a4a4a]">
                  {provider.variants.some((v) => v.live) ? "" : "mock"}
                </span>
              </div>
              <div className="space-y-0.5">
                {provider.variants.map((v) => {
                  const isSel = selectedVariant === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => pick({ kind: "single", variantId: v.id })}
                      className={[
                        "group block w-full rounded-lg px-2.5 py-2 text-left transition-all hover:bg-white hover:text-black",
                        isSel ? "bg-[#1c1c1c]" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-black">
                          {v.name}
                        </span>
                        <span
                          className={[
                            "rounded px-1 font-mono text-[8px] uppercase",
                            v.live
                              ? "border border-[#3a5a3a] text-[#7fae7f] group-hover:border-black group-hover:text-black"
                              : "border border-[#444444] text-[#888888] group-hover:border-black group-hover:text-black",
                          ].join(" ")}
                        >
                          {v.live ? "live" : "soon"}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#888888] group-hover:text-[#222222]">
                        {v.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
