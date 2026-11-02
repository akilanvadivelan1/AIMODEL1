import type { ModelId, ModelInfo } from "./types";

/**
 * The registry of models our chatbot can route to.
 * Each model has a role in the OmniMinds pipeline + its transferable superpower.
 * Strengths double as documentation and as the basis for routing.
 */
export const MODELS: Record<ModelId, ModelInfo> = {
  kiro: {
    id: "kiro",
    name: "Kiro SDD Engine",
    short: "Kiro",
    vendor: "AWS",
    stage: 1,
    stageLabel: "Kiro SDD Architect",
    badge: "EARS SPEC",
    role: "System Architect",
    tagline: "Spec-Driven Development, EARS criteria & steering guardrails",
    superpower: "Spec-Driven Development (SDD) & EARS syntax",
    mechanism: "Generates testable specs before code emission",
    strengths: [
      "Enforces formal EARS requirement models",
      "Injects pre-execution steering hooks",
      "Requires phased task roadmaps first",
      "Prevents code hallucinations",
    ],
  },
  gemini: {
    id: "gemini",
    name: "Gemini 2.5 Core",
    short: "Gemini",
    vendor: "Google",
    stage: 2,
    stageLabel: "Gemini 2.5 Grounding Lens",
    badge: "2M RECALL",
    role: "Research Intelligence",
    tagline: "2M token mega-context & real-time live grounding",
    superpower: "2M+ mega context & real-time web search",
    mechanism: "Deep document caching & live source grounding",
    strengths: [
      "Ingests multi-gigabyte repos, PDFs, transcripts",
      "Grounded in real-time web citations",
      "Near-perfect needle retrieval",
      "Synthesizes cross-file dependencies",
    ],
  },
  claude: {
    id: "claude",
    name: "Claude 3.7 Core",
    short: "Claude",
    vendor: "Anthropic",
    stage: 3,
    stageLabel: "Claude 3.7 Deep Reasoning",
    badge: "<THINK>",
    role: "Principal Critic",
    tagline: "Extended scratchpad reasoning & deep vulnerability critique",
    superpower: "Extended <thinking> scratchpad & edge reasoning",
    mechanism: "Analyzes race conditions & security vectors",
    strengths: [
      "Extended chain-of-thought deliberation",
      "Spots subtle boundary conditions",
      "Finds side-channel vulnerabilities",
      "Natural, readable technical prose",
    ],
  },
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT-4o Core",
    short: "ChatGPT",
    vendor: "OpenAI",
    stage: 4,
    stageLabel: "ChatGPT-4o Execution Runner",
    badge: "SANDBOX",
    role: "Tactical Operator",
    tagline: "Tactical execution, function calling & sandboxed verification",
    superpower: "Function calling ecosystem & sandbox runner",
    mechanism: "Executes code & runs assertions in a test runner",
    strengths: [
      "Deterministic function calling",
      "Code synthesis & sandbox test runs",
      "Verifies math, regex, algorithms",
      "Requirements to production endpoints",
    ],
  },
};

/** Pipeline order: Kiro -> Gemini -> Claude -> ChatGPT. */
export const PIPELINE_ORDER: ModelId[] = ["kiro", "gemini", "claude", "chatgpt"];

export const MODEL_LIST: ModelInfo[] = PIPELINE_ORDER.map((id) => MODELS[id]);
