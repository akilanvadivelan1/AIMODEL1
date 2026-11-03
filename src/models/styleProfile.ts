import { getApiKey } from "./apiKey";
import { askGemini } from "./gemini";

const SAMPLE_KEY = "omnidesk.style.sample.v1";
const PROFILE_KEY = "omnidesk.style.profile.v1";

export interface StyleProfile {
  /** The raw writing sample the user pasted. */
  sample: string;
  /** A concise, model-generated description of the user's writing style. */
  description: string;
  updatedAt: number;
}

export function getStyleProfile(): StyleProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StyleProfile;
  } catch {
    return null;
  }
}

export function getStyleSample(): string {
  try {
    return localStorage.getItem(SAMPLE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearStyleProfile(): void {
  try {
    localStorage.removeItem(SAMPLE_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Analyzes a writing sample with Gemini and stores a reusable style profile.
 * Returns the profile, or throws with a friendly message on failure.
 */
export async function analyzeAndSaveStyle(
  sample: string,
  signal?: AbortSignal
): Promise<StyleProfile> {
  const trimmed = sample.trim();
  if (trimmed.length < 20) {
    throw new Error("Please paste a longer sample (a full email or two works best).");
  }
  if (!getApiKey()) {
    throw new Error("Connect a Gemini API key first (the key icon in the header).");
  }

  const instruction =
    "Analyze the following writing sample and produce a concise style guide (6 to 10 short bullet points) that another writer could follow to imitate this exact voice. Cover: tone and formality, sentence length and rhythm, vocabulary level, greetings and sign-offs, punctuation habits, use of contractions, and any recurring quirks. Output only the bullet points, no preamble.";

  const description = await askGemini(
    `${instruction}\n\n--- SAMPLE ---\n${trimmed}`,
    [],
    "gemini-2.5-flash",
    "single",
    signal
  );

  const profile: StyleProfile = {
    sample: trimmed,
    description: description.trim(),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(SAMPLE_KEY, trimmed);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota errors */
  }
  return profile;
}

/**
 * Returns an instruction block to append to the system prompt so the model
 * writes in the user's voice. Empty string if no profile is set.
 */
export function styleInstruction(): string {
  const profile = getStyleProfile();
  if (!profile) return "";
  return (
    "\n\nWhen writing emails, messages, or any prose on the user's behalf, match THIS personal writing style:\n" +
    profile.description +
    "\n\nHere is a sample of the user's own writing to imitate:\n\"\"\"\n" +
    truncate(profile.sample, 1200) +
    "\n\"\"\""
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
