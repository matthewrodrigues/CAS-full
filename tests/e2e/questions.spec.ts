// Live questions (docs/SPEC.md sections 5 and 7): every type, the countdown, drafts, lock, pause.
// One event (E2EB1) played in order, so the tests run serially and share the host and player.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { createTeam, expectNoAxeViolations, expectNoHorizontalScroll, hostApi, joinAsPlayer, type HostApi } from './support'

test.describe.configure({ mode: 'serial' })

let context: BrowserContext
let page: Page
let host: HostApi
let eventId: string

test.beforeAll(async ({ browser, baseURL }) => {
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  page = await context.newPage()
  eventId = await joinAsPlayer(page, JOIN_CODES.questions, 'Quiz Whiz')
  await createTeam(page, 'Question Marks')
  host = await hostApi(test.info().project.use.baseURL ?? baseURL!)
})

test.afterAll(async () => {
  await host.dispose()
  await context.close()
})

/** Reveal whatever is open, then open the next question. */
async function nextQuestion() {
  const { state } = await host.state(eventId)
  if (state.phase === 'live') await host.act('host_lock', eventId)
  if (['live', 'locked'].includes(state.phase)) await host.act('host_reveal', eventId)
  await host.act('host_next', eventId)
}

test('multiple choice submits on tap and can change until the lock', async () => {
  await host.act('host_next', eventId) // question 1, mc
  await expect(page.getByRole('heading', { name: "What is the deepest known point in Earth's oceans?" })).toBeVisible()
  await expect(page.getByText('Question 1 of 10')).toBeVisible()
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)

  await page.getByRole('button', { name: 'Tonga Trench' }).click()
  await expect(page.getByText('Your answer: Tonga Trench')).toBeVisible()
  await page.getByRole('button', { name: 'Puerto Rico Trench' }).click()
  await expect(page.getByText('Your answer: Puerto Rico Trench')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Puerto Rico Trench' })).toHaveAttribute('aria-pressed', 'true')

  await host.act('host_lock', eventId)
  await expect(page.getByRole('heading', { name: 'Answers are locked' })).toBeVisible()
  await expect(page.getByText('Your answer: Puerto Rico Trench')).toBeVisible()
})

test('a typed answer saves as a draft, survives a reload, and submits', async () => {
  await nextQuestion() // question 2, typed
  const input = page.getByLabel('Your answer')
  await input.fill('octo')
  await expect(page.getByText('Draft saved')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Your answer')).toHaveValue('octo')
  await expectNoAxeViolations(page)

  await page.getByLabel('Your answer').fill('octopus')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await expect(page.getByText("Your team's answer: octopus")).toBeVisible()
})

test('true/false and closest number submit', async () => {
  await nextQuestion() // question 3, true/false
  await page.getByRole('button', { name: 'True' }).click()
  await expect(page.getByText('Your answer: True')).toBeVisible()

  await nextQuestion() // question 4, closest number
  await page.getByLabel('Your guess').fill('nineteen')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByRole('alert')).toHaveText('Enter a number, like 1955.')
  await page.getByLabel('Your guess').fill('1955')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText("Your team's answer: 1955")).toBeVisible()
})

test('the countdown counts down, and freezes while paused', async () => {
  await nextQuestion() // question 5, mc, 20 s
  const timer = page.getByRole('timer')
  await expect(timer).toBeVisible()
  const seconds = async () => Number((await timer.textContent())?.match(/\d+/)?.[0])
  expect(await seconds()).toBeLessThanOrEqual(20)

  await host.act('host_pause', eventId)
  await expect(page.getByText('Paused by the host')).toBeVisible()
  const frozen = await seconds()
  await page.waitForTimeout(2000)
  expect(await seconds()).toBe(frozen)
  await expect(page.getByRole('button', { name: 'Bioluminescence' })).toBeDisabled()

  await host.act('host_resume', eventId)
  await expect(page.getByText('Paused by the host')).toHaveCount(0)
  await expect.poll(seconds, { timeout: 5000 }).toBeLessThan(frozen)
})

test('a failed answer says why and keeps the last accepted one', async () => {
  await page.getByRole('button', { name: 'Bioluminescence' }).click()
  await expect(page.getByText('Your answer: Bioluminescence')).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Fluorescence' }).click()
  // An offline request may hang until the client's 8 s timeout gives up on it.
  await expect(page.getByRole('alert')).toHaveText("Can't reach the game. Check your connection and try again.", { timeout: 12_000 })
  await expect(page.getByText('Your answer: Bioluminescence')).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Fluorescence' }).click()
  await expect(page.getByText('Your answer: Fluorescence')).toBeVisible()
})

test('picture and sound questions show their media, and sound questions their caption', async () => {
  // Skip the rest of round 1, then into round 2 (pictures).
  for (let state = (await host.state(eventId)).state; state.phase !== 'round_break'; state = (await host.state(eventId)).state) {
    if (state.phase === 'live' || state.phase === 'locked') await host.act('host_skip', eventId)
    else await host.act('host_next', eventId)
  }
  await host.act('host_next', eventId)
  await expect(page.getByRole('img', { name: 'Picture for this question' })).toBeVisible()
  await expectNoAxeViolations(page)

  for (let state = (await host.state(eventId)).state; state.phase !== 'round_break'; state = (await host.state(eventId)).state) {
    if (state.phase === 'live' || state.phase === 'locked') await host.act('host_skip', eventId)
    else await host.act('host_next', eventId)
  }
  await host.act('host_next', eventId)
  await expect(page.locator('audio')).toBeVisible()
  const { state } = await host.state(eventId)
  await expect(page.getByText(state.live_payload.caption)).toBeVisible()
})

test('a captain-only event lets only the captain answer', async ({ browser }) => {
  const captain = await browser.newPage()
  const crewEvent = await joinAsPlayer(captain, JOIN_CODES.captainOnly, 'Captain Kay')
  await createTeam(captain, 'Captained')
  const crew = await browser.newPage()
  await joinAsPlayer(crew, JOIN_CODES.captainOnly, 'Crew Lee')
  await crew.getByRole('button', { name: 'Join Captained' }).click()

  await host.act('host_next', crewEvent)
  await expect(crew.getByText('Your captain answers for the team.')).toBeVisible()
  await expect(crew.getByRole('button', { name: 'Challenger Deep' })).toHaveCount(0)
  await captain.getByRole('button', { name: 'Challenger Deep' }).click()
  await expect(crew.getByText("Your team's answer: Challenger Deep")).toBeVisible()
  await host.act('host_lock', crewEvent)
})
