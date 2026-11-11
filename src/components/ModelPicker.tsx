import { MODELS } from "../models/skills";

/** Choose which Gemini model to use. */
export function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Gemini model</span>
      <span className="pointer-events-none absolute left-3 h-2 w-2 rounded-full bg-ink" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={MODELS.find((m) => m.id === value)?.desc}
        className="cursor-pointer appearance-none whitespace-nowrap rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] py-1.5 pl-7 pr-8 text-xs font-semibold text-ink shadow-sm outline-none transition-all hover:bg-[#e6ddca] focus:border-ink"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#6a6255]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}
