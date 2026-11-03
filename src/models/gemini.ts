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
    `${BASE}/models?key=${encodeURIComponent(key)}&pageSize=1000`,
    { signal }
  );
  if (!res.ok) {
    cachedKey = key;
    cachedModels = [];
    return [];
  }

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

/** Ranks models so a sensible chat model comes first. */
function rank(m: string, prefersFlash: boolean): number {
  let score = 0;
  if (m.includes("2.5")) score += 5;
  else if (m.includes("2.0")) score += 3;
  else if (m.includes("1.5")) score += 2;
  if (m.includes("flash") === prefersFlash) score += 2;
  if (m.includes("flash")) score += 1;
  if (m.includes("lite")) score += 1;
  if (m.endsWith("-latest")) score += 1;
  // Steer away from non-chat / special models.
  if (/embedding|aqa|vision|image|tts|audio|learnlm/.test(m)) score -= 8;
  if (/preview|exp|thinking/.test(m)) score -= 1;
  return score;
}

/**
 * Builds an ordered list of model names to try: the preferred one first (if the
 * key supports it, or always if we couldn't list), then every other usable
 * model ranked best-first. Guarantees we try everything the key can run.
 */
async function candidateModels(
  preferred: string,
  key: string,
  signal?: AbortSignal
): Promise<string[]> {
  const usable = await listUsableModels(key, signal);
  const prefersFlash = preferred.includes("flash");

  if (usable.length === 0) {
    // Couldn't list (older key/endpoint). Try a spread of common names.
    return [
      preferred,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-1.5-flash",
      "gemini-pro-latest",
    ].filter((v, i, a) => a.indexOf(v) === i);
  }

  const ranked = [...usable].sort((a, b) => rank(b, prefersFlash) - rank(a, prefersFlash));
  // Put the preferred model first if the key supports it.
  const ordered = usable.includes(preferred)
    ? [preferred, ...ranked.filter((m) => m !== preferred)]
    : ranked;
  return ordered;
}

function systemInstruction(mode: Mode): string {
  const base =
    "You are OmniDesk, a helpful personal AI assistant. Answer directly and conversationally in clear, well-structured paragraphs. Do not show your reasoning steps, labels, or stage headers. Just give the answer a person wants to read.";
  if (mode === "quad") {
    return (
      base +
      " Internally combine four strengths: precise framing of the question, grounded and up-to-date facts, careful reasoning about nuance, and a clean final synthesis. Blend them into one seamless answer."
    );
  }
  return base;
}

/**
 * Calls the real Gemini API and returns a paragraph answer. Tries each model
 * the key supports until one works. Throws AbortError if cancelled; returns a
 * friendly error string on failure.
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

  // Figure out which models to try, best-first.
  let candidates: string[];
  try {
    candidates = await candidateModels(apiModel, key, signal);
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    candidates = [apiModel];
  }
  if (candidates.length === 0) {
    return "That key has no chat-capable Gemini models. Create a fresh key at aistudio.google.com and reconnect.";
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

  const TRANSIENT = new Set([429, 500, 502, 503, 504]);
  let lastStatus = 0;

  // Try each candidate model in order.
  for (const model of candidates) {
    // Per-model: a few attempts for transient errors.
    for (let attempt = 1; attempt <= 3; attempt++) {
      let res: Response;
      try {
        res = await fetch(ENDPOINT(model, key), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") throw err;
        if (attempt < 3) {
          await backoff(attempt, signal);
          continue;
        }
        return "Could not reach Gemini. Check your network connection and try again.";
      }

      if (res.ok) {
        return extractText(await res.json());
      }

      lastStatus = res.status;

      // Bad key: no point trying other models.
      if (res.status === 400 || res.status === 403) {
        return 'That Gemini API key was rejected. Click "Connect" in the header and paste a valid key.';
      }

      // This model doesn't exist for the key: try the NEXT candidate.
      if (res.status === 404) break;

      // Transient: back off and retry the same model.
      if (TRANSIENT.has(res.status) && attempt < 3) {
        await backoff(attempt, signal);
        continue;
      }

      // Other errors: move on to the next candidate.
      break;
    }
  }

  // Nothing worked.
  if (lastStatus === 429) {
    return "Gemini is rate-limiting your key right now. Wait a minute and try again.";
  }
  if (lastStatus === 503 || lastStatus === 500) {
    return "Gemini's servers are busy right now. Please try again in a moment.";
  }
  if (lastStatus === 404) {
    const n = cachedModels?.length ?? 0;
    return (
      `Your key could list ${n} model(s), but none accepted a request (404). ` +
      "This usually means the key's Google Cloud project does not have the Gemini API fully enabled. " +
      "Fix: go to aistudio.google.com/app/apikey, click \"Create API key in a NEW project\", and paste that fresh key into Connect."
    );
  }
  return `Could not get a response from Gemini (last error ${lastStatus || "network"}). Try again, or reconnect your key.`;
}

function extractText(data: unknown): string {
  const d = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  const text = d?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (text) return text;
  const blocked = d?.promptFeedback?.blockReason;
  if (blocked) return `The response was blocked (${blocked}). Try rephrasing.`;
  return "Gemini returned an empty response. Try rephrasing.";
}

/** Exponential backoff with jitter, abortable. Waits ~0.6s, 1.2s... */
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
