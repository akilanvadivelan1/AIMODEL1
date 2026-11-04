/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OMNIDESK_DESKTOP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
