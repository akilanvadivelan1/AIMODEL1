import type { ModelId, ModelInfo } from "./types";

/**
 * The registry of models our chatbot can route to.
 * Strengths double as documentation and as the basis for future auto-routing.
 */
export const MODELS: Record<ModelId, ModelInfo> = {
  claude: {
    id: "claude",
    name: "Claude",
    vendor: "Anthropic",
    tagline: "Reasoning, coding, long-form writing",
    strengths: [
      "Multi-file coding and refactoring",
      "Following nuanced instructions",
      "High-quality long-form writing",
      "Large context, stays coherent",
    ],
    accent: "bg-orange-500",
    accentText: "text-orange-600",
    accentRing: "ring-orange-500",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    vendor: "Google",
    tagline: "Multimodal, huge context, grounded",
    strengths: [
      "Native image / audio / video / PDF input",
      "Among the largest context windows",
      "Search-grounded, fresh answers",
      "Fast and cheap at scale (Flash)",
    ],
    accent: "bg-blue-500",
    accentText: "text-blue-600",
    accentRing: "ring-blue-500",
  },
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    tagline: "Versatile all-rounder, tools, voice",
    strengths: [
      "Broad tool / plugin ecosystem",
      "Voice and realtime conversation",
      "Built-in image generation",
      "Reliable structured outputs (JSON)",
    ],
    accent: "bg-emerald-500",
    accentText: "text-emerald-600",
    accentRing: "ring-emerald-500",
  },
  kiro: {
    id: "kiro",
    name: "Kiro",
    vendor: "AWS",
    tagline: "Spec-driven, agentic repo work",
    strengths: [
      "Spec-driven feature builds",
      "Agentic exploration and editing of real repos",
      "Steering rules and event hooks",
      "End-to-end coding workflows",
    ],
    accent: "bg-purple-500",
    accentText: "text-purple-600",
    accentRing: "ring-purple-500",
  },
};

export const MODEL_LIST: ModelInfo[] = Object.values(MODELS);
