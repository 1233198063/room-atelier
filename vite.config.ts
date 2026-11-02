import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Saves live in localStorage, which belongs to one origin, port included. Falling back to the
  // next free port would open on an empty project, so use a fixed port and fail if it's taken.
  // /api is the floor-plan reader in server/ (npm run dev:server).
  server: { port: 5180, strictPort: true, proxy: { "/api": "http://localhost:5181" } },
  preview: { port: 5180, strictPort: true },
  build: {
    // three.js alone is ~700 kB minified; the 3D canvas *is* the app, so splitting it buys nothing.
    chunkSizeWarningLimit: 1600,
  },
});
