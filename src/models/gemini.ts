import { getApiKey } from "./apiKey";

type Mode = "quad" | "single";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

const ENDPOINT = (model: string, key: string) =>
  `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

// Cache of models actually usable by the current key (per key).
let cachedKey = "";
let cachedModels: string[] | null = null;

/**
 * Asks Google which models THIS key can actually use for generateContent.
 * Returns bare model ids like "gemini-2.5-flash". Cached per key.
 */
async function listUsableModels(
  key: string,
  signal?: AbortSignal
): Promise<string[]> {
  if (cachedKey === key && cachedModels) return cachedModels;

  const res = await fetch(
    `${BASE}/models?key=${encodeURIComponent(key)}&pageSize=200`,
    { signal }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const models: string[] = (data?.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent")
    )
    .map((m: { name?: string }) => (m.name ?? "").replace(/^models\//, ""))
    .filter(Boolean);

  cachedKey = key;
  cachedModels = models;
  return models;
}

/**
 * Picks the best real model name for the key: the requested one if the key
 * supports it, otherwise the closest available (prefer a 2.5 flash, then any
 * flash, then any gemini model). Returns null if the key has none.
 */
async function resolveModel(
  preferred: string,
  key: string,
  signal?: AbortSignal
): Promise<string | null> {
  const usable = await listUsableModels(key, signal);
  if (usable.length === 0) return preferred; // couldn't list; try as-is

  if (usable.includes(preferred)) return preferred;

  const prefersFlash = preferred.includes("flash");
  const rank = (m: string): number => {
    let score = 0;
    if (m.includes("2.5")) score += 4;
    else if (m.includes("2.0")) score += 2;
    if (m.includes("flash") === prefersFlash) score += 2;
    if (m.includes("flash")) score += 1;
    if (m.includes("latest")) score += 1;
    // Avoid preview/experimental/vision-only when possible.
    if (/preview|exp|vision|embedding|aqa/.test(m)) score -= 3;
    return score;
  };
  const best = [...usable].sort((a, b) => rank(b) - rank(a))[0];
  return best ?? null;
}

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
  signal?: AbortSignal,
  extraSystem?: string
): Promise<string> {
  const key = getApiKey();
  if (!key) return "No Gemini API key set.";

  // Resolve to a model this key can actually use (auto-fallback).
  let model: string;
  try {
    const resolved = await resolveModel(apiModel, key, signal);
    if (!resolved) {
      return "Your key has no usable chat models. Create a fresh key at aistudio.google.com and reconnect.";
    }
    model = resolved;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    model = apiModel; // listing failed; try the requested name directly
  }

  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const body = {
    systemInstruction: {
      parts: [{ text: systemInstruction(mode) + (extraSystem ?? "") }],
    },
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
      res = await fetch(ENDPOINT(model, key), {
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
      // The model name was wrong. Invalidate cache, re-resolve, retry once.
      cachedModels = null;
      cachedKey = "";
      if (attempt < MAX_ATTEMPTS) {
        try {
          const reResolved = await resolveModel("gemini-flash", key, signal);
          if (reResolved && reResolved !== model) {
            model = reResolved;
            await backoff(attempt, signal);
            continue;
          }
        } catch {
          /* fall through */
        }
      }
      return "No matching Gemini model is available for your key. Create a fresh key at aistudio.google.com and reconnect.";
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
