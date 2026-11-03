import { getApiKey } from "./apiKey";

type Mode = "quad" | "single";

const HOST = "https://generativelanguage.googleapis.com";
// Newer AQ. keys and older AIza keys can differ in which version responds, so
// we try v1beta first, then v1.
const API_VERSIONS = ["v1beta", "v1"] as const;

const listUrl = (version: string, key: string) =>
  `${HOST}/${version}/models?key=${encodeURIComponent(key)}&pageSize=1000`;

const genUrl = (version: string, model: string, key: string) =>
  `${HOST}/${version}/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`;

// Send the key as a header too (preferred for the new AQ. key format).
const keyHeaders = (key: string) => ({
  "Content-Type": "application/json",
  "x-goog-api-key": key,
});

// Cache of models usable by the current key, plus which API version worked.
let cachedKey = "";
let cachedModels: string[] | null = null;
let cachedVersion: string = API_VERSIONS[0];

/**
 * Asks Google which models THIS key can use for generateContent, trying each
 * API version. Records the version that responded. Cached per key.
 */
async function listUsableModels(
  key: string,
  signal?: AbortSignal
): Promise<string[]> {
  if (cachedKey === key && cachedModels) return cachedModels;

  for (const version of API_VERSIONS) {
    let res: Response;
    try {
      res = await fetch(listUrl(version, key), {
        headers: keyHeaders(key),
        signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      continue;
    }
    if (!res.ok) continue;

    const data = await res.json();
    const models: string[] = (data?.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes("generateContent")
      )
      .map((m: { name?: string }) => (m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);

    if (models.length > 0) {
      cachedKey = key;
      cachedModels = models;
      cachedVersion = version;
      return models;
    }
  }

  cachedKey = key;
  cachedModels = [];
  return [];
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

  // Version order: the one that listed models first, then the rest.
  const versions = [
    cachedVersion,
    ...API_VERSIONS.filter((v) => v !== cachedVersion),
  ];

  // Try each candidate model against each API version.
  for (const model of candidates) {
    for (const version of versions) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        let res: Response;
        try {
          res = await fetch(genUrl(version, model, key), {
            method: "POST",
            headers: keyHeaders(key),
            body: JSON.stringify(body),
            signal,
          });
        } catch (err) {
          if ((err as Error).name === "AbortError") throw err;
          if (attempt < 2) {
            await backoff(attempt, signal);
            continue;
          }
          return "Could not reach Gemini. Check your network connection and try again.";
        }

        if (res.ok) {
          cachedVersion = version; // remember what worked
          return extractText(await res.json());
        }

        lastStatus = res.status;

        // Bad key: stop entirely.
        if (res.status === 400 || res.status === 403) {
          return 'That Gemini API key was rejected. Click "Connect" and paste a valid key (it may start with "AQ." or "AIza").';
        }

        // Model/version not found: try the next version, then next model.
        if (res.status === 404) break;

        // Transient: back off and retry the same model+version.
        if (TRANSIENT.has(res.status) && attempt < 2) {
          await backoff(attempt, signal);
          continue;
        }

        break;
      }
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
      `Reached Google and found ${n} model(s), but the request returned 404. ` +
      "Try again in a moment. If it keeps failing, the key's project may not have the Gemini API enabled, so create a new key at aistudio.google.com and reconnect."
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
