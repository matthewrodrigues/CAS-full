import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiOrigin = `http://localhost:${process.env.PORT ?? 3000}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Pre-bundled up front, so a cold cache doesn't reload pages mid-run (it flaked the first e2e run).
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'react-router', 'react-router/dom', '@tanstack/react-query', 'zustand', 'i18next', 'react-i18next', 'lucide-react', 'radix-ui', 'class-variance-authority', 'cn'],
  },
  server: {
    // The e2e run sets E2E_WEB_PORT (playwright.config.ts); plain dev keeps Vite's default.
    port: process.env.E2E_WEB_PORT ? Number(process.env.E2E_WEB_PORT) : undefined,
    // The Hono server (server/index.ts) owns /api, /ws and /media; Vite only serves the SPA in dev.
    proxy: {
      '/api': apiOrigin,
      '/media': apiOrigin,
      '/ws': { target: apiOrigin.replace('http', 'ws'), ws: true },
    },
  },
})
