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

/**
 * Builds the conversational, ChatGPT-style paragraph answer shown in Unified view.
 * MOCKED: it cannot actually know facts yet, so it returns a natural-sounding
 * placeholder paragraph. When the live APIs are wired into callModel(), this
 * same slot receives the real synthesized answer — the shape never changes.
 */
function buildUnified(prompt: string, participants: ModelId[]): string {
  const p = prompt.trim() || "your question";
  const multi = participants.length > 1;

  const opener = multi
    ? `Here's a combined answer to "${p}", drawing on each model's strengths.`
    : `Here's my take on "${p}".`;

  const body =
    `In a live deployment this is where you'd get a full, natural-language response, written as flowing paragraphs the way ChatGPT answers. ` +
    (multi
      ? `Behind the scenes the four models cooperate: Kiro frames the problem, Gemini pulls in grounded up-to-date facts, Claude reasons through the nuances, and ChatGPT pulls it together into this clear reply. You can expand "Pipeline View" anytime to see each model's individual contribution.`
      : `Right now you're routed to a single model, so you'd get its direct answer in its own voice.`);

  const note = `(This is a mocked response, so it can't provide real facts yet. Once the ${multi ? "four APIs are" : "API is"} connected, this exact paragraph is replaced by the real answer.)`;

  return `${opener} ${body}\n\n${note}`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
