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
  server: {
    // The Hono server (server/index.ts) owns /api, /ws and /media; Vite only serves the SPA in dev.
    proxy: {
      '/api': apiOrigin,
      '/media': apiOrigin,
      '/ws': { target: apiOrigin.replace('http', 'ws'), ws: true },
    },
  },
})
