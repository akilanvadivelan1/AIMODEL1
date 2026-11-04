import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./backend";

/** The public OmniDesk website. */
export const SITE_URL = "https://akilanvadivelan1.github.io/AIMODEL1/";

/**
 * Open a web page in the user's browser.
 * Inside the Mac app, links do nothing on their own, so Rust opens them.
 */
export function openExternal(url: string): void {
  if (isTauri) {
    invoke("open_external", { url }).catch(() => {
      /* ignore */
    });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
