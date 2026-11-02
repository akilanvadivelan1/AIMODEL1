import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the repo name so assets resolve on GitHub Pages
// (served from https://<user>.github.io/AIMODEL1/).
export default defineConfig({
  base: "/AIMODEL1/",
  plugins: [react()],
});
