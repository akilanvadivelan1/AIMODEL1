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
      <span className="pointer-events-none absolute left-3 h-2 w-2 rounded-full bg-white" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={MODELS.find((m) => m.id === value)?.desc}
        className="cursor-pointer appearance-none whitespace-nowrap rounded-lg border border-[#2f2f2f] bg-[#1a1a1a] py-1.5 pl-7 pr-8 text-xs font-semibold text-white shadow-sm outline-none transition-all hover:bg-[#252525] focus:border-white"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#888888]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}
