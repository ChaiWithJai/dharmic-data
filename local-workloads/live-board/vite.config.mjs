import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@tldraw/assets"] },
  server: { proxy: { "/live": { target: "http://127.0.0.1:8893", ws: true } } },
});
