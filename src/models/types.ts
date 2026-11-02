export type ModelId = "claude" | "gemini" | "chatgpt" | "kiro";

export interface ModelInfo {
  id: ModelId;
  name: string;
  vendor: string;
  /** Short tagline shown in the picker. */
  tagline: string;
  /** What this model is best at, used for the badge tooltip and auto-routing later. */
  strengths: string[];
  /** Tailwind classes for the model's accent color (badge, selector highlight). */
  accent: string;
  accentText: string;
  accentRing: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which model produced this message (assistant messages only). */
  model?: ModelId;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}
