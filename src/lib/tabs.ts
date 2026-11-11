import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./backend";

/** A browser tab the user can pick. Only exists in the Mac app. */
export interface BrowserTab {
  browser: string;
  windowId: number;
  tabIndex: number;
  title: string;
  url: string;
  /** False for settings pages, new tab pages and other pages with no text to read. */
  readable: boolean;
}

export interface TabList {
  tabs: BrowserTab[];
  /** Plain-language problems, one per browser that could not be listed. */
  errors: string[];
}

/** Tab reading uses macOS scripting, so it only works inside the Mac app. */
export const tabsSupported = isTauri;

export const tabKey = (t: Pick<BrowserTab, "browser" | "windowId" | "tabIndex">) =>
  `${t.browser}|${t.windowId}|${t.tabIndex}`;

export async function listTabs(): Promise<TabList> {
  return invoke<TabList>("list_browser_tabs");
}

/** Read the text of one tab. Throws a plain-language message on failure. */
export async function readTab(t: BrowserTab): Promise<string> {
  try {
    return await invoke<string>("read_browser_tab", {
      browser: t.browser,
      windowId: t.windowId,
      tabIndex: t.tabIndex,
    });
  } catch (e) {
    throw new Error(typeof e === "string" ? e : "Could not read the tab.");
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
