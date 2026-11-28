import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: runs on port 5174. The PHP backend (Apache, e.g. XAMPP at http://localhost)
// is reached through the /flashcard-reviewer proxy.
// Build: output is served from /flashcard-reviewer/apps/notepad/ on Apache.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/flashcard-reviewer/apps/notepad/' : '/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/flashcard-reviewer': { target: 'http://localhost', changeOrigin: true },
    },
  },
}))
