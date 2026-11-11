import { DEFAULT_MODEL, getSkill, MODELS, SKILLS, type Prefs, type SkillId, type ToolId } from "./skills";

const PREFS_KEY = "omnidesk.prefs.v2";

export const DEFAULT_PREFS: Prefs = {
  model: DEFAULT_MODEL,
  skill: "chat",
  search: false,
  think: false,
  code: false,
};

/**
 * Turns anything (saved data, data from the account) into valid preferences,
 * or null if it is not usable. Unknown models fall back to the default.
 */
export function normalizePrefs(raw: unknown): Prefs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.skill !== "string" || !SKILLS.some((s) => s.id === r.skill)) return null;
  if (typeof r.search !== "boolean" || typeof r.think !== "boolean" || typeof r.code !== "boolean") {
    return null;
  }
  const model =
    typeof r.model === "string" && MODELS.some((m) => m.id === r.model) ? r.model : DEFAULT_MODEL;
  // Search and code cannot run together in one Gemini request.
  const code = r.code && !r.search;
  return { model, skill: r.skill as SkillId, search: r.search, think: r.think, code };
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return (raw && normalizePrefs(JSON.parse(raw))) || DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Switch skill. The tools reset to what that skill normally uses. */
export function withSkill(prefs: Prefs, id: SkillId): Prefs {
  const t = getSkill(id).tools;
  return { ...prefs, skill: id, search: t.search, think: t.think, code: t.code };
}

/** Flip one tool. Search and code are never on together. */
export function withToolToggled(prefs: Prefs, tool: ToolId): Prefs {
  const next = { ...prefs, [tool]: !prefs[tool] };
  if (tool === "search" && next.search) next.code = false;
  if (tool === "code" && next.code) next.search = false;
  return next;
}
