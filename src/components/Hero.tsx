interface Starter {
  title: string;
  badge: string;
  desc: string;
  prompt: string;
}

const STARTERS: Starter[] = [
  {
    title: "KIRO + CHATGPT",
    badge: "SPEC+RUN",
    desc: "Generate a spec-driven distributed Redis rate limiter with atomic Lua and verified tests.",
    prompt:
      "Design and implement a production-grade distributed Redis rate limiter for FastAPI with strict EARS compliance and runnable sandbox tests.",
  },
  {
    title: "GEMINI 2.5 CORE",
    badge: "2M CTX",
    desc: "Synthesize current AI accelerator chips (B200 vs TPU v6 vs MI350) with live web citations.",
    prompt:
      "Synthesize current AI accelerator chips: NVIDIA B200 vs Google TPU v6 vs AMD MI350, grounded with live citations.",
  },
  {
    title: "CLAUDE 3.7 THINKING",
    badge: "<THINK>",
    desc: "Critique cryptographic endpoints for timing attacks using deep chain-of-thought analysis.",
    prompt:
      "Perform a security audit on a cryptographic token verification endpoint. Audit for timing attacks and specify constant-time requirements.",
  },
  {
    title: "FULL QUAD-CO-OP",
    badge: "ALL 4",
    desc: "Execute autonomous end-to-end flow: Spec ➔ Research ➔ Reason ➔ Code verification.",
    prompt:
      "Execute an autonomous end-to-end flow: specify, research, reason about edge cases, then implement and verify.",
  },
];

export function Hero({ onStarter }: { onStarter: (prompt: string) => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-4 pt-8 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white p-3 text-black shadow-2xl">
        <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </svg>
      </div>

      <div>
        <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-white sm:text-2xl">
          OMNIMINDS // NOIR CORE
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg font-mono text-xs leading-relaxed text-[#888888]">
          Personal multi-agent orchestration uniting{" "}
          <strong className="text-white">Kiro</strong> (Spec Architecture),{" "}
          <strong className="text-white">Gemini</strong> (2M Context Grounding),{" "}
          <strong className="text-white">Claude</strong> (Deep Reasoning), and{" "}
          <strong className="text-white">ChatGPT</strong> (Execution Runner).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-2 text-left font-mono sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s.title}
            onClick={() => onStarter(s.prompt)}
            className="group rounded-xl border border-[#282828] bg-[#171717] p-3.5 text-left shadow-md transition-all duration-200 hover:border-white hover:bg-[#202020]"
          >
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 bg-white" />
                <span>{s.title}</span>
              </span>
              <span className="rounded border border-[#444444] px-1 py-0.5 text-[9px] text-[#888888] group-hover:border-white group-hover:text-white">
                {s.badge}
              </span>
            </div>
            <p className="text-xs leading-snug text-[#b0b0b0]">{s.desc}</p>
            <span className="mt-2 block text-[10px] text-[#666666] group-hover:text-white">
              Run scenario ➔
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
