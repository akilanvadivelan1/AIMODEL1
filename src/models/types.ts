import type { SkillId } from "./skills";

/** A file the user attached: image, screenshot, or document (base64 inline). */
export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  /** base64-encoded file contents (no data: prefix). */
  data: string;
  isImage: boolean;
}

/** A web page Gemini used to answer, when Search is on. */
export interface Source {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  /** For assistant messages this is the answer in Markdown. Empty while thinking. */
  content: string;
  /** Files attached to a user message. */
  attachments?: Attachment[];
  sources?: Source[];
  /** Google's search suggestions (HTML), shown with answers that used Search. */
  searchHtml?: string;
  /** True when content is an error message rather than an answer. */
  error?: boolean;
  /** True when the answer hit the length limit. */
  truncated?: boolean;
  /** How the answer was made. */
  meta?: { model: string; skill: SkillId };
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}
