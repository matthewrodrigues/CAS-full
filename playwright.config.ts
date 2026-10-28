import { defineConfig, devices } from '@playwright/test'
import { E2E_HOST_PASSCODE, E2E_STAFF_PASSCODE } from './tests/e2e/constants.ts'

/** Its own ports, so an e2e run never reuses (or collides with) a running `npm run dev`. */
const WEB_PORT = 5174
const API_PORT = 3101

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs Vite's first-run compile on a cold cache (known flake, see the M3 ledger).
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'on-first-retry' },
  projects: [
    {
      // Players are on phones; design references are 390px wide (docs/SPEC.md section 11).
      name: 'mobile-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    // A fresh data/e2e database every run (scripts/e2e-prepare.ts); data/app.db is never touched.
    command: 'npm run e2e:server',
    env: {
      DATA_DIR: 'data/e2e',
      PORT: String(API_PORT),
      HOST_PASSCODE: E2E_HOST_PASSCODE,
      STAFF_PASSCODE: E2E_STAFF_PASSCODE,
    },
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
})
