import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const quizExamDirectory = fileURLToPath(
  new URL('./src/features/quiz-exam', import.meta.url)
)

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@quiz': quizExamDirectory,
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})