import { getApiKey } from "./apiKey";

type Mode = "quad" | "single";

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
function systemInstruction(mode: Mode): string {
  const base =
    "You are OmniMinds, a helpful assistant. Answer directly and conversationally in clear, well-structured paragraphs. Do not show your reasoning steps, labels, or stage headers. Just give the answer a person wants to read.";
  if (mode === "quad") {
    return (
      base +
      " Internally combine four strengths: precise framing of the question, grounded and up-to-date facts, careful reasoning about nuance, and a clean final synthesis. Blend them into one seamless answer."
    );
  }
  return base;
}

/**
 * Calls the real Gemini API and returns a paragraph answer.
 * Throws AbortError if cancelled; returns a friendly error string on failure.
 */
export async function askGemini(
  prompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  apiModel: string,
  mode: Mode,
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

  // Transient errors (model overloaded / rate limited) are retried
  // automatically with exponential backoff before giving up.
  const TRANSIENT = new Set([429, 500, 502, 503, 504]);
  const MAX_ATTEMPTS = 4;

  let res: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetch(ENDPOINT(apiModel, key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      // Network blip: retry unless it was the last attempt.
      if (attempt < MAX_ATTEMPTS) {
        await backoff(attempt, signal);
        continue;
      }
      return "Could not reach the Gemini API. Check your network connection and try again.";
    }

    if (res.ok) break;

    // Non-retryable errors: fail fast with a clear message.
    if (res.status === 400 || res.status === 403) {
      return "That Gemini API key was rejected. Click \"Connect\" in the header and check the key.";
    }
    if (res.status === 404) {
      return "That model isn't available for your key. Pick a different Gemini model from the dropdown.";
    }

    // Transient: back off and retry.
    if (TRANSIENT.has(res.status) && attempt < MAX_ATTEMPTS) {
      await backoff(attempt, signal);
      continue;
    }

    // Out of retries.
    if (res.status === 429) {
      return "Gemini is rate-limiting your key right now. Wait a minute and try again.";
    }
    if (res.status === 503) {
      return "Gemini's servers are busy right now (we retried a few times). Please try again in a moment.";
    }
    return `Gemini API error (${res.status}). Please try again.`;
  }

  if (!res) {
    return "Gemini's servers are busy right now. Please try again in a moment.";
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

/** Exponential backoff with jitter, abortable. Waits ~0.6s, 1.2s, 2.4s... */
function backoff(attempt: number, signal?: AbortSignal): Promise<void> {
  const ms = 600 * Math.pow(2, attempt - 1) + Math.random() * 300;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}
