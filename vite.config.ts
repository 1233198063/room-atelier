import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js alone is ~700 kB minified; the 3D canvas *is* the app, so splitting it buys nothing.
    chunkSizeWarningLimit: 1600,
  },
});
