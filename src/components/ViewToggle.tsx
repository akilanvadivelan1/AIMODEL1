import type { ViewMode } from "../models/types";

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="hidden items-center rounded-lg border border-[#252525] bg-[#0d0d0d] p-0.5 text-xs sm:flex">
      <button
        onClick={() => onChange("pipeline")}
        className={[
          "flex items-center space-x-1.5 rounded-md px-3 py-1 font-semibold transition-all",
          value === "pipeline"
            ? "bg-white text-black shadow-sm"
            : "text-[#888888] hover:text-white",
        ].join(" ")}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span>Pipeline View</span>
      </button>
      <button
        onClick={() => onChange("unified")}
        className={[
          "flex items-center space-x-1.5 rounded-md px-3 py-1 font-semibold transition-all",
          value === "unified"
            ? "bg-white text-black shadow-sm"
            : "text-[#888888] hover:text-white",
        ].join(" ")}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <span>Unified Text</span>
      </button>
    </div>
  );
}
