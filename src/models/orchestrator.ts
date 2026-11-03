import type { AssistantTurn, Attachment, ModelId, StageOutput } from "./types";
import { PIPELINE_ORDER } from "./registry";
import { getApiKey } from "./apiKey";
import { askGemini, type InlineFile } from "./gemini";
import { getVariant } from "./catalog";
import { styleInstruction } from "./styleProfile";
import type { Selection } from "../components/ModelSwitcher";

export interface OrchestrateOptions {
  selection: Selection;
  prompt: string;
  history?: { role: "user" | "assistant"; content: string }[];
  attachments?: Attachment[];
  signal?: AbortSignal;
  onStage?: (stage: StageOutput) => void;
}

/**
 * ────────────────────────────────────────────────────────────────
 *  SINGLE SWAP POINT — everything flows through orchestrate().
 *
 *  A Selection is either { quad } (all 4) or { single, variantId }
 *  (a specific provider+model chosen from the dropdown).
 *
 *  If the chosen variant is "live" (Gemini today) AND a key is set,
 *  we return a REAL answer. Otherwise we return a clearly-labelled mock.
 *  The UI never changes either way.
 * ────────────────────────────────────────────────────────────────
 */
export async function orchestrate(
  opts: OrchestrateOptions
): Promise<AssistantTurn> {
  const { selection, prompt, history, attachments, signal, onStage } = opts;

  const participants: ModelId[] =
    selection.kind === "quad"
      ? [...PIPELINE_ORDER]
      : [getVariant(selection.variantId).provider];

  // Per-model stages for Pipeline view.
  const stages: StageOutput[] = [];
  for (const model of participants) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const content = mockStage(model, prompt);
    const stage: StageOutput = { model, content };
    stages.push(stage);
    onStage?.(stage);
  }

  // Decide whether we can produce a real answer.
  const hasKey = !!getApiKey();
  const liveVariant =
    selection.kind === "quad"
      ? "gemini-2.5-flash" // quad uses Gemini as the real brain
      : getVariant(selection.variantId).live
        ? selection.variantId
        : null;

  const files: InlineFile[] = (attachments ?? []).map((a) => ({
    mimeType: a.mimeType,
    data: a.data,
  }));

  let unified: string;
  if (hasKey && liveVariant) {
    const apiModel = getVariant(liveVariant).apiModel;
    unified = await askGemini(
      prompt,
      history ?? [],
      apiModel,
      selection.kind,
      signal,
      styleInstruction(),
      files
    );
  } else if (!hasKey && liveVariant) {
    unified = mockNeedKey(prompt);
  } else {
    unified = mockNotLive(prompt, selection);
  }

  return { stages, unified, participants };
}

function mockStage(model: ModelId, prompt: string): string {
  const p = truncate(prompt.trim() || "the task", 120);
  switch (model) {
    case "kiro":
      return `[Spec] Framed "${p}" into clear, testable requirements.`;
    case "gemini":
      return `[Grounding] Pulled in current, relevant facts for "${p}".`;
    case "claude":
      return `[Reasoning] Weighed the nuances and edge cases.`;
    case "chatgpt":
      return `[Synthesis] Pulled it together into the final reply.`;
  }
}

function mockNeedKey(prompt: string): string {
  const p = prompt.trim() || "your question";
  return (
    `I'd love to answer "${p}", but no API key is set yet.\n\n` +
    `Click "Connect" in the header, paste a free Gemini key, and ask again for a real answer.`
  );
}

function mockNotLive(prompt: string, selection: Selection): string {
  const p = prompt.trim() || "your question";
  const name =
    selection.kind === "single" ? getVariant(selection.variantId).name : "this model";
  return (
    `${name} isn't connected to a live API yet, so I can't give a real answer to "${p}".\n\n` +
    `For real answers right now, pick a Gemini model from the dropdown (marked "live") and add a free key via "Connect". The other providers need their own paid keys plus a backend, which we can wire up next.`
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
