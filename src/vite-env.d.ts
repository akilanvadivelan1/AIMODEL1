/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OMNIDESK_DESKTOP?: string;
  /** Base URL of the OmniDesk backend. When empty, accounts are turned off. */
  readonly VITE_API_URL?: string;
  /** Google OAuth Web client ID for "Continue with Google". */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
