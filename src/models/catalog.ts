import type { ModelId } from "./types";

/** A specific selectable model variant within a provider. */
export interface ModelVariant {
  /** Stable id, e.g. "gemini-2.5-flash". */
  id: string;
  /** Display name, e.g. "Gemini 2.5 Flash". */
  name: string;
  /** One-line description. */
  desc: string;
  /** The provider this variant belongs to. */
  provider: ModelId;
  /** The real API model string (used when the provider is wired in). */
  apiModel: string;
  /** Whether a live API path exists today (Gemini) or is mock-only for now. */
  live: boolean;
}

export interface Provider {
  id: ModelId;
  name: string;
  vendor: string;
  variants: ModelVariant[];
}

/**
 * The full catalog: choose a provider (AI), then a specific model within it.
 * Gemini variants are live (real API). The others are mock-only until their
 * paid APIs + a backend are wired in — they are clearly marked.
 */
export const PROVIDERS: Provider[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    vendor: "Google",
    variants: [
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        desc: "Fast, free-tier friendly, great all-rounder",
        provider: "gemini",
        apiModel: "gemini-2.0-flash",
        live: true,
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        desc: "Deeper reasoning, larger context",
        provider: "gemini",
        apiModel: "gemini-2.5-pro",
        live: true,
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        desc: "Stable, widely available legacy flash",
        provider: "gemini",
        apiModel: "gemini-1.5-flash-latest",
        live: true,
      },
    ],
  },
  {
    id: "chatgpt",
    name: "OpenAI ChatGPT",
    vendor: "OpenAI",
    variants: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        desc: "Flagship multimodal all-rounder",
        provider: "chatgpt",
        apiModel: "gpt-4o",
        live: false,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o mini",
        desc: "Cheaper, faster, lightweight",
        provider: "chatgpt",
        apiModel: "gpt-4o-mini",
        live: false,
      },
      {
        id: "gpt-4.1",
        name: "GPT-4.1",
        desc: "Strong coding and long context",
        provider: "chatgpt",
        apiModel: "gpt-4.1",
        live: false,
      },
    ],
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    vendor: "Anthropic",
    variants: [
      {
        id: "claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet",
        desc: "Best balance of reasoning and speed",
        provider: "claude",
        apiModel: "claude-3-7-sonnet-latest",
        live: false,
      },
      {
        id: "claude-3.5-haiku",
        name: "Claude 3.5 Haiku",
        desc: "Fast and economical",
        provider: "claude",
        apiModel: "claude-3-5-haiku-latest",
        live: false,
      },
      {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        desc: "Deepest reasoning, highest cost",
        provider: "claude",
        apiModel: "claude-3-opus-latest",
        live: false,
      },
    ],
  },
  {
    id: "kiro",
    name: "Kiro SDD Engine",
    vendor: "AWS",
    variants: [
      {
        id: "kiro-spec",
        name: "Kiro Spec Mode",
        desc: "Spec-driven, EARS requirements first",
        provider: "kiro",
        apiModel: "kiro-spec",
        live: false,
      },
    ],
  },
];

/** Flat lookup of every variant by id. */
export const VARIANTS: Record<string, ModelVariant> = Object.fromEntries(
  PROVIDERS.flatMap((p) => p.variants).map((v) => [v.id, v])
);

export const DEFAULT_VARIANT_ID = "gemini-2.5-flash";

export function getVariant(id: string): ModelVariant {
  return VARIANTS[id] ?? VARIANTS[DEFAULT_VARIANT_ID];
}
