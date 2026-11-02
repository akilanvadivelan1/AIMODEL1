import type { ChatMessage, ModelId } from "./types";
import { MODELS } from "./registry";

export interface SendOptions {
  model: ModelId;
  messages: ChatMessage[];
  /** Streamed chunks of the reply. */
  onToken?: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * ────────────────────────────────────────────────────────────────
 *  SINGLE SWAP POINT
 *  Today this returns a mocked, streamed response per model.
 *  To go live, replace the body of `sendMessage` with real API calls
 *  (e.g. a fetch to /api/chat that fans out to Anthropic / Google /
 *  OpenAI / Kiro based on `model`). The UI never needs to change.
 * ────────────────────────────────────────────────────────────────
 */
export async function sendMessage(opts: SendOptions): Promise<string> {
  const { model, messages, onToken, signal } = opts;

  // === MOCK IMPLEMENTATION =====================================
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const reply = buildMockReply(model, lastUser?.content ?? "");

  // Simulate token-by-token streaming with a small delay.
  const words = reply.split(" ");
  let acc = "";
  for (const word of words) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await delay(18 + Math.random() * 40);
    acc += (acc ? " " : "") + word;
    onToken?.(word + " ");
  }
  return acc;
  // === END MOCK ================================================
}

function buildMockReply(model: ModelId, prompt: string): string {
  const info = MODELS[model];
  const trimmed = prompt.trim();
  const topic = trimmed ? `"${truncate(trimmed, 80)}"` : "that";

  return [
    `[${info.name} · ${info.vendor} — mocked]`,
    `Here's how I'd approach ${topic}.`,
    `I'm standing in for ${info.name}, so this response is simulated for now.`,
    `My wheelhouse: ${info.strengths.slice(0, 2).join(", ").toLowerCase()}.`,
    `Once you wire in the real ${info.vendor} API, this exact message slot gets the live answer. The interface around it stays identical.`,
  ].join(" ");
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
