// Helpers for the e2e specs: a host driving the game over the API, a player joining in the
// browser, and the axe check every core screen must pass (docs/SPEC.md section 9).
import AxeBuilder from '@axe-core/playwright'
import { expect, request, type Page } from '@playwright/test'
import { E2E_HOST_PASSCODE } from './constants'

/** A host session over HTTP, as the Milestone 4 console will drive the game. */
export async function hostApi(baseURL: string) {
  const context = await request.newContext({ baseURL })
  const login = await context.post('/api/login', { data: { passcode: E2E_HOST_PASSCODE } })
  expect(login.status()).toBe(200)
  const post = async (path: string, data: unknown) => {
    const res = await context.post(path, { data })
    const body = await res.json()
    expect({ path, status: res.status(), body }).toMatchObject({ status: 200 })
    return body
  }
  return {
    act: (operation: string, eventId: string) => post(`/api/${operation}`, { event_id: eventId }),
    post,
    state: async (eventId: string) => (await (await context.get(`/api/get_state?event_id=${eventId}`)).json()),
    dispose: () => context.dispose(),
  }
}
export type HostApi = Awaited<ReturnType<typeof hostApi>>

/** Joins in the browser through the nickname screen; returns the event id from the join response. */
export async function joinAsPlayer(page: Page, joinCode: string, nickname: string): Promise<string> {
  await page.goto(`/play/${joinCode}`)
  const joined = page.waitForResponse((res) => res.url().endsWith('/api/join_event') && res.status() === 200)
  await page.getByLabel('Your nickname').fill(nickname)
  await page.getByRole('button', { name: 'Join the game' }).click()
  return (await (await joined).json()).event.id
}

/** Creates a team from the team screen and waits for the lobby. */
export async function createTeam(page: Page, name: string) {
  await page.getByLabel('Team name').fill(name)
  await page.getByRole('button', { name: 'Create team' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

/** No WCAG 2.2 AA violations on the current screen. */
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

/** The 390px layout must never scroll sideways. */
export async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}
