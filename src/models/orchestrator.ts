import type {
  AssistantTurn,
  ModelId,
  RouteMode,
  StageOutput,
} from "./types";
import { PIPELINE_ORDER } from "./registry";
import { getApiKey } from "./apiKey";
import { askGemini } from "./gemini";

export interface OrchestrateOptions {
  mode: RouteMode;
  prompt: string;
  /** Prior conversation turns, oldest first, for context. */
  history?: { role: "user" | "assistant"; content: string }[];
  signal?: AbortSignal;
  /** Called as each model stage completes (used for Pipeline view). */
  onStage?: (stage: StageOutput) => void;
}

/**
 * ────────────────────────────────────────────────────────────────
 *  SINGLE SWAP POINT — everything flows through orchestrate().
 *
 *  If a Gemini API key is set (entered in the UI, stored locally),
 *  we return a REAL answer from Gemini. Otherwise we fall back to a
 *  clearly-labelled mock. The UI never changes either way.
 *
 *  For "quad" mode we still produce per-model stages for Pipeline view,
 *  but the default Unified answer is one clean paragraph reply.
 * ────────────────────────────────────────────────────────────────
 */
export async function orchestrate(
  opts: OrchestrateOptions
): Promise<AssistantTurn> {
  const { mode, prompt, history, signal, onStage } = opts;

  const participants: ModelId[] =
    mode === "quad" ? [...PIPELINE_ORDER] : [mode];

  const hasKey = !!getApiKey();

  // Build per-model stages (only needed for Pipeline view).
  const stages: StageOutput[] = [];
  for (const model of participants) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const content = mockStage(model, prompt);
    const stage: StageOutput = { model, content };
    stages.push(stage);
    onStage?.(stage);
  }

  // The conversational paragraph answer (what users actually read).
  let unified: string;
  if (hasKey) {
    unified = await askGemini(prompt, history ?? [], mode, signal);
  } else {
    unified = mockUnified(prompt, participants);
  }

  return { stages, unified, participants };
}

/** Per-model stage text for Pipeline view (always mocked flavour text). */
function mockStage(model: ModelId, prompt: string): string {
  const p = truncate(prompt.trim() || "the task", 120);
  switch (model) {
    case "kiro":
      return `[Spec] Framed "${p}" into clear, testable requirements before answering.`;
    case "gemini":
      return `[Grounding] Pulled in current, relevant facts for "${p}".`;
    case "claude":
      return `[Reasoning] Weighed the nuances and edge cases around "${p}".`;
    case "chatgpt":
      return `[Synthesis] Pulled it together into the final reply.`;
  }
}

function mockUnified(prompt: string, participants: ModelId[]): string {
  const p = prompt.trim() || "your question";
  const multi = participants.length > 1;
  return (
    `I'd love to actually answer "${p}" for you, but no AI model is connected yet, so I can't give you real facts.\n\n` +
    `Add a free Gemini API key (click the key icon in the header) and I'll respond with a real, ChatGPT-style paragraph answer${multi ? ", combining the four models' strengths behind the scenes" : ""}. Until then this is placeholder text.`
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
