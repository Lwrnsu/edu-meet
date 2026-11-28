import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: runs on port 5173. PHP (Apache, XAMPP at http://localhost) is reached through
// /flashcard-reviewer, and Spring Boot (port 8080) through /springboot.
// Build: output is served from /flashcard-reviewer/apps/reviewer/ on Apache.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/flashcard-reviewer/apps/reviewer/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/flashcard-reviewer': { target: 'http://localhost', changeOrigin: true },
      // Spring Boot (mvn spring-boot:run) on port 8080. /springboot/api/... -> /api/...
      '/springboot': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/springboot/, ''),
      },
    },
  },
}))
