import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['edu-meet.app'],
    proxy: { '/api': 'http://localhost:8080' },
    watch: {
      usePolling: true,
    },
  },
})