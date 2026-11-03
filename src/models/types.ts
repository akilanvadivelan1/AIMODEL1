export type ModelId = "kiro" | "gemini" | "claude" | "chatgpt";

/** Routing mode: a single model, or the full quad pipeline. */
export type RouteMode = ModelId | "quad";

/** How a multi-model answer is displayed. */
export type ViewMode = "pipeline" | "unified";

export interface ModelInfo {
  id: ModelId;
  /** Full display name, e.g. "Claude 3.7 Core". */
  name: string;
  /** Short name for pills/badges, e.g. "Claude". */
  short: string;
  vendor: string;
  /** 1-4, position in the pipeline. */
  stage: number;
  /** Label shown on the pipeline stage header. */
  stageLabel: string;
  /** Short badge text, e.g. "EARS SPEC". */
  badge: string;
  /** Role in the orchestration, e.g. "System Architect". */
  role: string;
  tagline: string;
  superpower: string;
  mechanism: string;
  strengths: string[];
}

/** One model's contribution to an orchestrated answer. */
export interface StageOutput {
  model: ModelId;
  content: string;
}

export interface AssistantTurn {
  /** Per-model stage outputs (always all 4 for quad; just one for single). */
  stages: StageOutput[];
  /** The merged, single-voice answer used in Unified view. */
  unified: string;
  /** Which models actually participated. */
  participants: ModelId[];
}

/** A file the user attached: image, screenshot, or document (base64 inline). */
export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  /** base64-encoded file contents (no data: prefix). */
  data: string;
  isImage: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Files attached to a user message. */
  attachments?: Attachment[];
  /** For assistant messages: the orchestrated multi-stage result. */
  turn?: AssistantTurn;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}
