import type { Selection } from "../components/ModelSwitcher";

const SELECTION_KEY = "omnidesk.selection.v1";

const DEFAULT_SELECTION: Selection = { kind: "quad" };

/** The AI the user last chose. Shared by the main app and the quick widget. */
export function loadSelection(): Selection {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return DEFAULT_SELECTION;
    const parsed = JSON.parse(raw) as Selection;
    if (parsed.kind === "quad") return parsed;
    if (parsed.kind === "single" && typeof parsed.variantId === "string") return parsed;
    return DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

export function saveSelection(selection: Selection): void {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    /* ignore */
  }
}
