import { SKILLS, type SkillId } from "../models/skills";

/** The row of skill chips above the message box. */
export function SkillBar({
  value,
  onChange,
}: {
  value: SkillId;
  onChange: (id: SkillId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Skills"
      className="flex gap-1.5 overflow-x-auto pb-0.5 font-mono text-[11px]"
    >
      {SKILLS.map((s) => {
        const on = s.id === value;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={on}
            title={s.tagline}
            onClick={() => onChange(s.id)}
            className={[
              "whitespace-nowrap rounded-full border px-3 py-1 font-bold transition-all",
              on
                ? "border-white bg-white text-black"
                : "border-[#2e2e2e] bg-[#141414] text-[#999999] hover:border-[#666666] hover:text-white",
            ].join(" ")}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
