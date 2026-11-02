import type { ModelId } from "../models/types";
import { MODELS } from "../models/registry";

export function ModelBadge({ model }: { model: ModelId }) {
  const info = MODELS[model];
  return (
    <span
      title={info.strengths.join(" · ")}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white ${info.accent}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {info.name}
    </span>
  );
}
