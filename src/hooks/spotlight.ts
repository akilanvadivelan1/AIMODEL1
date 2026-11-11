import type { PointerEvent } from "react";

// Tracks the pointer inside a card and exposes it as CSS variables so the
// .spotlight styles can draw a glow under the cursor.
export function onSpotlightMove(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}
