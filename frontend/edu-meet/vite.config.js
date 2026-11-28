import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: mode === "chat-local" ? { entries: ["chat-preview.html"] } : undefined,
  server: {
    host: mode === "chat-local" ? "127.0.0.1" : true,
    proxy: mode === "chat-local" ? {
      "/api": "http://127.0.0.1:8080",
      "^/chat[?]": { target: "ws://127.0.0.1:8080", ws: true },
    } : undefined,
    allowedHosts: ["edu-meet.app"],
    watch: {
      usePolling: true,
    },
    proxy: {
      // Group 7 · PHP back end (php/ folder, the "php" service in docker-compose)
      "/php": {
        target: process.env.PHP_API_TARGET || "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/php/, ""),
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
}));
