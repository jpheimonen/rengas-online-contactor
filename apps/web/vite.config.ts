import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Keep the browser's Host header so the server's same-origin check sees the Vite origin.
    proxy: { "/api": { target: "http://127.0.0.1:8787", changeOrigin: false } },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: "./src/test-setup.ts",
  },
});
