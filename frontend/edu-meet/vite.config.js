import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: mode === "chat-local" ? { entries: ["chat-preview.html"] } : undefined,
  server: {
    host: mode === "chat-local" ? "127.0.0.1" : true,
    proxy: {
      "/api": {
        target: mode === "chat-local"
          ? "http://127.0.0.1:8080"
          : process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },
      ...(mode === "chat-local"
        ? {
            "^/chat[?]": {
              target: "ws://127.0.0.1:8080",
              ws: true,
            },
          }
        : {}),
    },
    allowedHosts: ["edu-meet.app"],
    watch: {
      usePolling: true,
    },
  },
  preview: {
    allowedHosts: process.env.VITE_PREVIEW_ALLOWED_HOST
      ? ["localhost", "127.0.0.1", "edu-meet.app", process.env.VITE_PREVIEW_ALLOWED_HOST]
      : undefined,
  },
}));
