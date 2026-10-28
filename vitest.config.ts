import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        test: { name: 'client', include: ['src/**/*.test.{ts,tsx}'], environment: 'node' },
      },
      {
        test: { name: 'server', include: ['server/**/*.test.ts'], environment: 'node', testTimeout: 15_000 }, // real sockets and the simulator share the CPU
      },
    ],
  },
})
