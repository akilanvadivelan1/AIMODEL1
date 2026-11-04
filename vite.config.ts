import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The web build is served from a subpath on GitHub Pages
// (https://<user>.github.io/AIMODEL1/), so it needs base "/AIMODEL1/".
// The desktop (Tauri) build loads assets from the app root, so it needs "/".
// The Tauri scripts set OMNIDESK_TARGET=desktop to switch the base.
const isDesktop = process.env.OMNIDESK_TARGET === "desktop";

export default defineConfig({
  // Relative base ("./") is the most robust for the Tauri webview, since it
  // resolves assets regardless of the internal URL scheme.
  base: isDesktop ? "./" : "/AIMODEL1/",
  plugins: [react()],
});
