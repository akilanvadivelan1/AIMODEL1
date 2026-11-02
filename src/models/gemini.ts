import type { RouteMode } from "./types";
import { getApiKey } from "./apiKey";

const MODEL = "gemini-1.5-flash-latest";
const ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`;

/**
 * System instruction shaping the OmniMinds persona. In "quad" mode we ask the
 * single underlying model to answer as if it fused the four strengths
 * (spec clarity, grounded facts, careful reasoning, clean synthesis), and to
 * reply in natural paragraphs the way ChatGPT/Gemini do.
 */
function systemInstruction(mode: RouteMode): string {
  const base =
    "You are OmniMinds, a helpful assistant. Answer directly and conversationally in clear, well-structured paragraphs. Do not show your reasoning steps, labels, or stage headers. Just give the answer a person wants to read.";
  if (mode === "quad") {
    return (
      base +
      " Internally combine four strengths: precise framing of the question, grounded and up-to-date facts, careful reasoning about nuance, and a clean final synthesis. Blend them into one seamless answer."
    );
  }
  const persona: Record<string, string> = {
    kiro: " Emphasize precise, well-structured, specification-minded answers.",
    gemini: " Emphasize grounded, factual, up-to-date answers.",
    claude: " Emphasize careful reasoning, nuance, and readable prose.",
    chatgpt: " Emphasize practical, direct, well-organized answers.",
  };
  return base + (persona[mode] ?? "");
}

/**
 * Calls the real Gemini API and returns a paragraph answer.
 * Throws AbortError if cancelled; returns a friendly error string on failure.
 */
export async function askGemini(
  prompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  mode: RouteMode,
  signal?: AbortSignal
): Promise<string> {
  const key = getApiKey();
  if (!key) return "No Gemini API key set.";

  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction(mode) }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT(MODEL, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return "Could not reach the Gemini API. Check your network connection.";
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) {
      return "That Gemini API key was rejected. Open the key icon in the header and check it.";
    }
    if (res.status === 429) {
      return "Gemini rate limit hit. Wait a moment and try again.";
    }
    return `Gemini API error (${res.status}). Try again.`;
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

  if (!text) {
    const blocked = data?.promptFeedback?.blockReason;
    if (blocked) return `The response was blocked (${blocked}). Try rephrasing.`;
    return "Gemini returned an empty response. Try rephrasing.";
  }
  return text;
}
