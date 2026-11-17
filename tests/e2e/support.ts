// Helpers for the e2e specs: a host driving the game over the API, a player joining in the
// browser, and the axe check every core screen must pass (docs/SPEC.md section 9).
import AxeBuilder from '@axe-core/playwright'
import { expect, request, type Page } from '@playwright/test'
import { E2E_HOST_PASSCODE } from './constants'

/**
 * Logins are limited to 5 a minute per IP (SPEC section 5), and every e2e login comes from this
 * machine. The server reads the client IP from the proxy's X-Forwarded-For, so each API login
 * here uses its own made-up address and its own bucket.
 */
const loginBucket = () => ({ 'x-forwarded-for': `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })

/** Signs a browser page in as host or staff without the passcode screen. */
export async function signInViaApi(page: Page, passcode: string) {
  const res = await page.context().request.post('/api/login', { data: { passcode }, headers: loginBucket() })
  expect(res.status()).toBe(200)
}

/** A host session over HTTP, as the Milestone 4 console will drive the game. */
export async function hostApi(baseURL: string) {
  const context = await request.newContext({ baseURL })
  const login = await context.post('/api/login', { data: { passcode: E2E_HOST_PASSCODE }, headers: loginBucket() })
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

/** Skips each question and advances (breaks, the wager, the final question) until the game reaches `phase`; gives up after 80 moves. */
export async function advanceTo(host: HostApi, eventId: string, phase: string) {
  for (let i = 0; i < 80; i++) {
    const state = (await host.state(eventId)).state.phase
    if (state === phase) return
    await host.act(state === 'live' || state === 'locked' || state === 'final_live' || state === 'final_locked' ? 'host_skip' : 'host_next', eventId)
  }
  throw new Error(`never reached ${phase}`)
}

/** Joins in the browser through the nickname screen; returns the event id from the join response. */
export async function joinAsPlayer(page: Page, joinCode: string, nickname: string): Promise<string> {
  await page.goto(`/play/${joinCode}`)
  const joined = page.waitForResponse((res) => res.url().endsWith('/api/join_event') && res.status() === 200)
  await page.getByLabel('Your nickname').fill(nickname)
  await page.getByRole('button', { name: "That's me!" }).click()
  return (await (await joined).json()).event.id
}

/** Creates a team from the team screen and waits for the lobby. */
export async function createTeam(page: Page, name: string) {
  await page.getByLabel('Team name').fill(name)
  await page.getByRole('button', { name: 'Start our team!' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

/** Taps a team on the team screen, then "Count me in!" (tap, then send), and waits for the team screen to close. */
export async function joinTeam(page: Page, name: string) {
  // A team row's name is the team name, a space, then its member line ("Kelp Crew 2 players").
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^${escaped} `) }).click()
  await page.getByRole('button', { name: 'Count me in!' }).click()
  await expect(page.getByRole('button', { name: 'Count me in!' })).toHaveCount(0)
}

/** A player driven over the API (its own cookie jar), to fill a game with other teams and teammates. */
export async function botPlayer(baseURL: string, joinCode: string, nickname: string) {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: loginBucket() })
  const post = async (path: string, data: unknown) => {
    const res = await context.post(path, { data })
    const body = await res.json()
    expect({ path, nickname, status: res.status(), body }).toMatchObject({ status: 200 })
    return body
  }
  const joined = await post('/api/join_event', { join_code: joinCode, nickname })
  return {
    eventId: joined.event.id as string,
    createTeam: async (name: string): Promise<string> => (await post('/api/create_team', { event_id: joined.event.id, name })).id,
    joinTeam: (teamId: string) => post('/api/join_team', { team_id: teamId }),
    dispose: () => context.dispose(),
  }
}

/**
 * Saves a full-page shot of the current screen as test-results/screens/<name>.png, named after its
 * design/screens/<name>.html reference so a reviewer can compare it with
 * design/review/shots/screens__<name>.png, then runs the axe check.
 */
export async function captureScreen(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `test-results/screens/${name}.png`, fullPage: true, animations: 'disabled' })
  await expectNoAxeViolations(page)
}

/** No WCAG 2.2 AA violations on the current screen. */
export async function expectNoAxeViolations(page: Page) {
  // A card's entrance (kit-rise) fades in from opacity 0: let finite animations end first, or axe
  // measures contrast mid-fade. Infinite ones (the breathing dot, idle characters) never end.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

/** The 390px layout must never scroll sideways. */
export async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

/** Taps an option on the answer sheet, then sends it for the team (a tap alone only circles it). */
export async function tapAndSend(page: Page, option: string) {
  await page.getByRole('button', { name: option }).click()
  await page.getByRole('button', { name: /^(That's our answer!|Send this one instead)$/ }).click()
}
