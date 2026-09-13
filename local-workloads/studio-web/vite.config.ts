import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@tldraw/assets"] },
  server: { proxy: { "/api": "http://127.0.0.1:8781" } },
  preview: { proxy: { "/api": "http://127.0.0.1:8781" } },
});
