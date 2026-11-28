import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const springHttp = process.env.VITE_SPRING_TARGET || "http://spring:8080";
  const springWs = process.env.VITE_SPRING_WS_TARGET || "ws://spring:8080";
  const phpHttp = process.env.VITE_PHP_TARGET || "http://php:8000";

  return {
    plugins: [react()],
    optimizeDeps: mode === "chat-local" ? { entries: ["chat-preview.html"] } : undefined,
    server: {
      host: "0.0.0.0",
      allowedHosts: ["edu-meet.app"],
      watch: {
        usePolling: true,
      },
      proxy: {
        // Group 7 · React calls the PHP module as /php/api/... (prefix removed for php:8000)
        "/php": {
          target: phpHttp,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/php/, ""),
        },
        // 1. Specific PHP endpoints go to php:8000 (add your PHP route prefixes here)
        "^/api/php": {
          target: phpHttp,
          changeOrigin: true,
        },
        // 2. Remaining /api endpoints (e.g., /api/chat, /api/attendance) go to spring:8080
        "/api": {
          target: springHttp,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("origin");
            });
          },
        },
        // 3. WebSocket chat traffic goes to spring:8080
        "^/chat[?]": {
          target: springWs,
          ws: true,
        },
      },
    },
  };
});
