import { getApiKey } from "./apiKey";
import type { Source } from "./types";

const HOST = "https://generativelanguage.googleapis.com";
// Try v1beta first, which has every feature. Fall back to v1 if a model is missing there.
const API_VERSIONS = ["v1beta", "v1"] as const;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type GeminiErrorKind =
  | "no_key"
  | "bad_key"
  | "rate_limit"
  | "busy"
  | "blocked"
  | "network"
  | "bad_request"
  | "empty"
  | "unknown";

/** An error whose message is safe to show to the user as is. */
export class GeminiError extends Error {
  kind: GeminiErrorKind;
  constructor(kind: GeminiErrorKind, message: string) {
    super(message);
    this.name = "GeminiError";
    this.kind = kind;
  }
}

const MSG = {
  no_key: "Add your Gemini key first. Click Connect and paste it in.",
  bad_key:
    "Google did not accept that key. Click Connect and paste a fresh one from aistudio.google.com/app/apikey.",
  network: "Could not reach Google. Check your internet connection and try again.",
  busy: "Google's servers are busy right now. Please try again in a moment.",
  empty: "Gemini sent back an empty answer. Try again, or rephrase your question.",
} as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InlineFile {
  mimeType: string;
  data: string; // base64, no prefix
}

export interface GenerateOptions {
  /** The model the user picked. If the key cannot use it, the best available one is used. */
  model: string;
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  prompt: string;
  files?: InlineFile[];
  /** Google Search grounding. */
  search?: boolean;
  /** Run Python code. Cannot be combined with search. */
  code?: boolean;
  /** Extended thinking. */
  think?: boolean;
  temperature?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  sources: Source[];
  /** HTML from Google that must be shown with grounded answers (Search Suggestions). */
  searchEntryPoint?: string;
  /** The model that actually answered. */
  model: string;
  /** True when the answer was cut off at the length limit. */
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Which models can this key use?
// ---------------------------------------------------------------------------

const authHeaders = (key: string) => ({
  "Content-Type": "application/json",
  "x-goog-api-key": key,
});

const listUrl = (version: string, key: string) =>
  `${HOST}/${version}/models?key=${encodeURIComponent(key)}&pageSize=1000`;

const generateUrl = (version: string, model: string, key: string) =>
  `${HOST}/${version}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

let cachedKey = "";
let cachedModels: string[] | null = null;
let cachedVersion: string = API_VERSIONS[0];

async function listUsableModels(key: string, signal?: AbortSignal): Promise<string[]> {
  if (cachedKey === key && cachedModels) return cachedModels;

  for (const version of API_VERSIONS) {
    let res: Response;
    try {
      res = await fetch(listUrl(version, key), { headers: authHeaders(key), signal });
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

function rank(m: string): number {
  let score = 0;
  if (m.includes("2.5")) score += 5;
  else if (m.includes("2.0")) score += 3;
  else if (m.includes("1.5")) score += 2;
  if (m.includes("flash")) score += 2;
  if (m.includes("lite")) score += 1;
  if (m.endsWith("-latest")) score += 1;
  if (/embedding|aqa|vision|image|tts|audio|learnlm|robotics|computer-use/.test(m)) score -= 8;
  if (/preview|exp|thinking/.test(m)) score -= 1;
  return score;
}

/** The preferred model first (if the key has it), then everything else, best first. */
async function candidateModels(preferred: string, key: string, signal?: AbortSignal): Promise<string[]> {
  const usable = await listUsableModels(key, signal);

  if (usable.length === 0) {
    // Could not list models. Try a spread of common names.
    return [
      preferred,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-1.5-flash",
    ].filter((v, i, a) => a.indexOf(v) === i);
  }

  const ranked = [...usable].sort((a, b) => rank(b) - rank(a));
  return usable.includes(preferred) ? [preferred, ...ranked.filter((m) => m !== preferred)] : ranked;
}

// ---------------------------------------------------------------------------
// Building the request
// ---------------------------------------------------------------------------

const supportsThinking = (model: string) => /gemini-(2\.5|3)/.test(model);

function thinkingConfigFor(model: string, think: boolean): Record<string, number> | undefined {
  if (!supportsThinking(model)) return undefined;
  if (think) return { thinkingBudget: -1 }; // let the model decide how much to think
  // Flash thinks by default, which is slower and uses up the output budget.
  // Pro cannot switch thinking off, and Flash-Lite already has it off.
  if (model.includes("flash") && !model.includes("lite")) return { thinkingBudget: 0 };
  return undefined;
}

function toolsFor(opts: GenerateOptions): Record<string, Record<string, never>>[] {
  if (opts.search) return [{ google_search: {} }];
  if (opts.code) return [{ code_execution: {} }];
  return [];
}

function buildBody(
  model: string,
  opts: GenerateOptions,
  sendThinking: boolean,
  sendTools: boolean
): Record<string, unknown> {
  const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (opts.prompt.trim()) userParts.push({ text: opts.prompt });
  for (const f of opts.files ?? []) userParts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
  if (userParts.length === 0) userParts.push({ text: "(no text)" });

  const contents = [
    ...opts.history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: userParts },
  ];

  const thinking = sendThinking ? thinkingConfigFor(model, !!opts.think) : undefined;
  const tools = sendTools ? toolsFor(opts) : [];

  return {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents,
    ...(tools.length ? { tools } : {}),
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      // Thinking tokens count against this limit, so it has to be generous.
      maxOutputTokens: 16384,
      ...(thinking ? { thinkingConfig: thinking } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Reading the response
// ---------------------------------------------------------------------------

interface ApiPart {
  text?: string;
  thought?: boolean;
  executableCode?: { language?: string; code?: string };
  codeExecutionResult?: { outcome?: string; output?: string };
}

interface ApiResponse {
  candidates?: {
    content?: { parts?: ApiPart[] };
    finishReason?: string;
    groundingMetadata?: {
      groundingChunks?: { web?: { uri?: string; title?: string } }[];
      searchEntryPoint?: { renderedContent?: string };
    };
  }[];
  promptFeedback?: { blockReason?: string };
}

const BLOCKED_FINISH = new Set(["SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"]);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function parseResponse(data: ApiResponse, model: string): GenerateResult {
  const cand = data.candidates?.[0];
  const finish = cand?.finishReason ?? "";
  const pieces: string[] = [];

  for (const p of cand?.content?.parts ?? []) {
    if (p.thought) continue; // never show the model's private reasoning
    if (typeof p.text === "string") {
      pieces.push(p.text);
    } else if (p.executableCode?.code) {
      const lang = (p.executableCode.language ?? "python").toLowerCase();
      pieces.push(`\n\n\`\`\`${lang}\n${p.executableCode.code.trim()}\n\`\`\`\n\n`);
    } else if (p.codeExecutionResult) {
      const out = String(p.codeExecutionResult.output ?? "").trim();
      if (out) pieces.push(`\n\nOutput:\n\n\`\`\`\n${out}\n\`\`\`\n\n`);
    }
  }

  const text = pieces.join("").replace(/\n{3,}/g, "\n\n").trim();

  if (!text) {
    const block = data.promptFeedback?.blockReason;
    if (block || BLOCKED_FINISH.has(finish)) {
      throw new GeminiError(
        "blocked",
        `Gemini could not answer that one (${(block ?? finish).toLowerCase().replace(/_/g, " ")}). Try rephrasing it.`
      );
    }
    if (finish === "MAX_TOKENS") {
      throw new GeminiError(
        "empty",
        "Gemini ran out of room before it could finish. Try a shorter question, or turn Think off."
      );
    }
    throw new GeminiError("empty", MSG.empty);
  }

  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const chunk of cand?.groundingMetadata?.groundingChunks ?? []) {
    const web = chunk.web;
    if (!web?.uri || seen.has(web.uri)) continue;
    seen.add(web.uri);
    sources.push({ title: web.title || hostOf(web.uri), url: web.uri });
  }

  return {
    text,
    sources,
    searchEntryPoint: cand?.groundingMetadata?.searchEntryPoint?.renderedContent,
    model,
    truncated: finish === "MAX_TOKENS",
  };
}

// ---------------------------------------------------------------------------
// Talking to Google
// ---------------------------------------------------------------------------

interface ApiErrorInfo {
  message: string;
  reason: string;
  retrySeconds: number | null;
}

async function readError(res: Response): Promise<ApiErrorInfo> {
  try {
    const j = (await res.json()) as {
      error?: { message?: string; details?: { reason?: string; retryDelay?: string }[] };
    };
    const details = j.error?.details ?? [];
    const reason = details.map((d) => d.reason).find(Boolean) ?? "";
    const delay = details.map((d) => d.retryDelay).find(Boolean);
    const retrySeconds = delay ? parseFloat(delay) : NaN;
    return {
      message: String(j.error?.message ?? ""),
      reason,
      retrySeconds: Number.isFinite(retrySeconds) ? retrySeconds : null,
    };
  } catch {
    return { message: "", reason: "", retrySeconds: null };
  }
}

function isKeyProblem(status: number, info: ApiErrorInfo): boolean {
  if (status === 401 || status === 403) return true;
  return (
    status === 400 &&
    (info.reason === "API_KEY_INVALID" || /api key (not valid|expired|invalid)|invalid api key/i.test(info.message))
  );
}

type Attempt =
  | { kind: "ok"; value: GenerateResult }
  | { kind: "next"; error: GeminiError }
  | { kind: "fatal"; error: GeminiError };

async function tryModel(
  model: string,
  version: string,
  key: string,
  opts: GenerateOptions
): Promise<Attempt> {
  let sendThinking = true;
  let sendTools = true;
  let transient = 0;

  for (let step = 0; step < 6; step++) {
    const body = buildBody(model, opts, sendThinking, sendTools);
    const hasThinking = !!(body.generationConfig as { thinkingConfig?: unknown }).thinkingConfig;
    const hasTools = Array.isArray(body.tools);

    let res: Response;
    try {
      res = await fetch(generateUrl(version, model, key), {
        method: "POST",
        headers: authHeaders(key),
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      if (++transient < 3) {
        await backoff(transient, opts.signal);
        continue;
      }
      return { kind: "fatal", error: new GeminiError("network", MSG.network) };
    }

    if (res.ok) return { kind: "ok", value: parseResponse((await res.json()) as ApiResponse, model) };

    const info = await readError(res);

    if (res.status === 404) {
      return { kind: "next", error: new GeminiError("unknown", `That model is not available for your key (${model}).`) };
    }

    if (isKeyProblem(res.status, info)) {
      const hint = /has not been used|disabled|not enabled/i.test(info.message)
        ? " The key's project may not have Gemini turned on. Create a new key in a new project at aistudio.google.com."
        : "";
      return { kind: "fatal", error: new GeminiError("bad_key", MSG.bad_key + hint) };
    }

    if (res.status === 400) {
      // Some models do not support thinking or a tool. Drop the extra and try again.
      if (hasThinking && /think/i.test(info.message)) {
        sendThinking = false;
        continue;
      }
      if (hasTools && /tool|search|ground|code.?execution|not supported/i.test(info.message)) {
        sendTools = false;
        continue;
      }
      const detail = info.message ? ` (${info.message.slice(0, 160)})` : "";
      return { kind: "fatal", error: new GeminiError("bad_request", `Gemini could not handle that request.${detail}`) };
    }

    if (res.status === 429) {
      const wait = info.retrySeconds;
      if (wait !== null && wait <= 15 && transient < 2) {
        transient++;
        await sleep(Math.ceil(wait * 1000) + 300, opts.signal);
        continue;
      }
      const when = wait !== null ? ` Try again in about ${Math.ceil(wait)} seconds.` : " Wait a minute and try again.";
      return {
        kind: "fatal",
        error: new GeminiError("rate_limit", `You have reached Google's usage limit for this key right now.${when}`),
      };
    }

    if (res.status >= 500) {
      if (++transient < 3) {
        await backoff(transient, opts.signal);
        continue;
      }
      return { kind: "fatal", error: new GeminiError("busy", MSG.busy) };
    }

    return {
      kind: "fatal",
      error: new GeminiError("unknown", `Google returned an unexpected error (${res.status}). Please try again.`),
    };
  }

  return { kind: "fatal", error: new GeminiError("unknown", "Gemini could not complete that request. Please try again.") };
}

/**
 * Ask Gemini. Tries the chosen model first, then falls back to others the key
 * can use. Throws a GeminiError whose message can be shown to the user.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const key = getApiKey();
  if (!key) throw new GeminiError("no_key", MSG.no_key);

  let candidates: string[];
  try {
    candidates = await candidateModels(opts.model, key, opts.signal);
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    candidates = [opts.model];
  }
  if (candidates.length === 0) {
    throw new GeminiError("bad_key", "That key has no chat-capable Gemini models. Create a fresh key at aistudio.google.com.");
  }

  let last: GeminiError | null = null;
  const versions = [cachedVersion, ...API_VERSIONS.filter((v) => v !== cachedVersion)];

  for (const model of candidates) {
    for (const version of versions) {
      const attempt = await tryModel(model, version, key, opts);
      if (attempt.kind === "ok") {
        cachedVersion = version;
        return attempt.value;
      }
      if (attempt.kind === "fatal") throw attempt.error;
      last = attempt.error;
    }
  }

  throw last ?? new GeminiError("unknown", "Gemini could not complete that request. Please try again.");
}

// ---------------------------------------------------------------------------
// Waiting
// ---------------------------------------------------------------------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

/** Exponential backoff with a little randomness: about 0.6s, 1.2s, 2.4s. */
function backoff(attempt: number, signal?: AbortSignal): Promise<void> {
  return sleep(600 * Math.pow(2, attempt - 1) + Math.random() * 300, signal);
}
