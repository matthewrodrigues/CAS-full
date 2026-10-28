// Loads one play page before any test, so Vite compiles the app once instead of under four
// parallel workers at once (a cold start otherwise timed tests out on their first page load).
import { chromium, type FullConfig } from '@playwright/test'

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${baseURL}/play/DEMO1`, { timeout: 120_000 })
  await page.getByRole('heading').first().waitFor({ timeout: 120_000 })
  await browser.close()
}
