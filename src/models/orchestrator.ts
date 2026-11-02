import type {
  AssistantTurn,
  ModelId,
  RouteMode,
  StageOutput,
} from "./types";
import { MODELS, PIPELINE_ORDER } from "./registry";

export interface OrchestrateOptions {
  mode: RouteMode;
  prompt: string;
  signal?: AbortSignal;
  /** Called as each model stage completes, so the UI can stream in results. */
  onStage?: (stage: StageOutput) => void;
}

/**
 * ────────────────────────────────────────────────────────────────
 *  SINGLE SWAP POINT — this is what makes model switching seamless.
 *
 *  Every message, in every mode, flows through orchestrate():
 *    - mode === "quad"  → run all 4 models as a pipeline
 *    - mode === <modelId> → run just that one model
 *
 *  The UI only ever sets `mode`. It never calls a provider directly.
 *  To go live, replace `callModel()` below with a real API request
 *  per provider. orchestrate() and the entire UI stay identical.
 * ────────────────────────────────────────────────────────────────
 */
export async function orchestrate(
  opts: OrchestrateOptions
): Promise<AssistantTurn> {
  const { mode, prompt, signal, onStage } = opts;

  const participants: ModelId[] =
    mode === "quad" ? [...PIPELINE_ORDER] : [mode];

  const stages: StageOutput[] = [];
  let context = ""; // each stage can build on the previous one's output

  for (const model of participants) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const content = await callModel(model, prompt, context, signal);
    const stage: StageOutput = { model, content };
    stages.push(stage);
    onStage?.(stage);
    context += `\n\n[${MODELS[model].short}] ${content}`;
  }

  return {
    stages,
    unified: buildUnified(prompt, participants),
    participants,
  };
}

/**
 * Calls a single model. MOCKED for now — returns a themed, realistic
 * stage output with a small streaming delay. Swap the body for a real
 * fetch to go live; the signature stays the same.
 */
async function callModel(
  model: ModelId,
  prompt: string,
  _priorContext: string,
  signal?: AbortSignal
): Promise<string> {
  await delay(400 + Math.random() * 500);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const p = truncate(prompt.trim() || "the task", 120);

  switch (model) {
    case "kiro":
      return [
        "[EARS Formal Specification]",
        `Deconstructed intent into testable clauses for: "${p}".`,
        "• EVENT-DRIVEN: WHEN the trigger occurs, THEN the system SHALL respond within budget.",
        "• STATE-DRIVEN: IF a precondition fails, THEN emit a defined error state.",
        "• UBIQUITOUS: The component SHALL enforce its invariant atomically.",
        "Steering hook active: phased task roadmap required before code emission.",
      ].join("\n");
    case "gemini":
      return [
        "[Live Grounding · 2M context]",
        `Retrieved current references relevant to "${p}".`,
        "No deprecated APIs or conflicting standards detected in the active window.",
        "Citations attached from authoritative, up-to-date sources.",
      ].join("\n");
    case "claude":
      return [
        "<thinking> Extended scratchpad reasoning",
        "1. Checked edge cases: boundary conditions, race windows, idempotency.",
        "2. Identified the subtle failure mode and the minimal fix.",
        "3. Confirmed the approach holds under burst/concurrent load.",
        "</thinking>",
        "Synthesis: the design is sound and the critical edge case is handled.",
      ].join("\n");
    case "chatgpt":
      return [
        "[Sandbox Execution Runner]",
        "Generated the implementation and ran assertions.",
        "```",
        "def run_task():",
        '    return {"status": "SUCCESS", "orchestration": "verified"}',
        "```",
        "Result: VERIFIED — all assertions passed, 0 failures.",
      ].join("\n");
  }
}

function buildUnified(prompt: string, participants: ModelId[]): string {
  const names = participants.map((m) => MODELS[m].short).join(", ");
  const p = truncate(prompt.trim() || "the task", 120);
  if (participants.length === 1) {
    const info = MODELS[participants[0]];
    return `${info.short} handled "${p}" as ${info.role.toLowerCase()}. ${info.mechanism}. (mocked — live ${info.vendor} API wires in later.)`;
  }
  return `OmniMinds synthesis for "${p}": specified by Kiro (EARS), grounded by Gemini (live citations), audited by Claude (edge cases), and implemented + verified by ChatGPT (sandbox). Models involved: ${names}. (mocked — live APIs wire in later.)`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
