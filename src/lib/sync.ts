import { api, backendEnabled, getToken, type SyncedSettings } from "./backend";
import { getApiKey, setApiKey } from "../models/apiKey";
import { loadPrefs, normalizePrefs, savePrefs } from "../models/prefs";
import { getStyleProfile, importStyleProfile } from "../models/styleProfile";

/**
 * Settings sync between this device and the signed-in account.
 *
 * Safety rule: nothing is pushed until the first pull has succeeded. That way a
 * fresh device with empty settings can never wipe what is saved on the server.
 */
let ready = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Call on sign-out or when the session is lost. */
export function resetSync(): void {
  ready = false;
  if (timer) clearTimeout(timer);
}

/** Send this device's settings to the account. */
async function pushNow(): Promise<void> {
  if (!backendEnabled || !getToken() || !ready) return;
  try {
    await api.putSettings({
      apiKey: getApiKey() || null,
      selection: loadPrefs(),
      styleProfile: getStyleProfile(),
    });
  } catch {
    // Stay quiet. The next change will try again.
  }
}

/** Wait a moment after the last change, then push once. */
export function schedulePush(): void {
  if (!ready) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void pushNow(), 800);
}

/**
 * Bring the account's settings onto this device, then send back anything the
 * account was missing. Where both sides have a value, the account wins.
 */
export async function pullSettings(): Promise<SyncedSettings> {
  const server = await api.getSettings();

  if (server.apiKey) setApiKey(server.apiKey);
  const prefs = normalizePrefs(server.selection);
  if (prefs) savePrefs(prefs);
  if (server.styleProfile) importStyleProfile(server.styleProfile);

  ready = true;
  await pushNow();
  return server;
}
