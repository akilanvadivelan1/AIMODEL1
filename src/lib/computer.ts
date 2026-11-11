import { invoke } from "@tauri-apps/api/core";
import type { AgentAction } from "../models/agent";

/** Which macOS switches are on. Both are needed for screen control. */
export interface Permissions {
  screen: boolean;
  accessibility: boolean;
}

export type RunMode = "ask" | "auto";

/** Sent from Rust to the overlay when a task begins. */
export interface TaskPayload {
  task: string;
  mode: RunMode;
  screenW: number;
  screenH: number;
  originX: number;
  originY: number;
}

export interface Shot {
  /** JPEG, base64. */
  image: string;
  width: number;
  height: number;
}

export interface Report {
  task: string;
  summary: string;
  success: boolean;
  steps: string[];
}

const msg = (e: unknown, fallback: string) => (typeof e === "string" ? e : e instanceof Error ? e.message : fallback);

export const getPermissions = () => invoke<Permissions>("agent_permissions");

export const openPrivacySettings = (pane: "screen" | "accessibility") =>
  invoke("open_privacy_settings", { pane }).catch(() => undefined);

export async function startTask(task: string, mode: RunMode): Promise<void> {
  try {
    await invoke("agent_start", { req: { task, mode } });
  } catch (e) {
    throw new Error(msg(e, "Could not start the task."));
  }
}

export async function captureScreen(): Promise<Shot> {
  try {
    return await invoke<Shot>("capture_screen");
  } catch (e) {
    throw new Error(msg(e, "Could not look at the screen."));
  }
}

export async function perform(action: AgentAction): Promise<void> {
  try {
    await invoke("agent_act", { action });
  } catch (e) {
    throw new Error(msg(e, "That action failed."));
  }
}

export const endTask = (report: Report) => invoke("agent_end", { report }).catch(() => undefined);
