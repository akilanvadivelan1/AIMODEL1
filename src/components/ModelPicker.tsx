import type { ModelId } from "../models/types";
import { MODEL_LIST } from "../models/registry";

interface Props {
  value: ModelId;
  onChange: (id: ModelId) => void;
}

export function ModelPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODEL_LIST.map((m) => {
        const selected = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            title={m.strengths.join(" · ")}
            className={[
              "group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
              selected
                ? `border-transparent text-white ${m.accent} shadow-sm`
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            <span
              className={[
                "h-2 w-2 rounded-full",
                selected ? "bg-white/90" : m.accent,
              ].join(" ")}
            />
            <span className="font-medium">{m.name}</span>
            <span
              className={[
                "text-xs",
                selected ? "text-white/80" : "text-slate-400",
              ].join(" ")}
            >
              {m.vendor}
            </span>
          </button>
        );
      })}
    </div>
  );
}
