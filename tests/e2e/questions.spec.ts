// Live questions (docs/SPEC.md sections 5 and 7): every type, the countdown, drafts, lock, pause.
// One event (E2EB1) played in order, so the tests run serially and share the host and player.
// Every question type is captured as test-results/screens/<name>.png (see design/screens/<name>.html).
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { captureScreen, createTeam, tapAndSend, expectNoAxeViolations, expectNoHorizontalScroll, hostApi, joinAsPlayer, joinTeam, type HostApi } from './support'

test.describe.configure({ mode: 'serial' })

const SENT_NOTE = "Sent! Tap another answer to change it before time's up."

let context: BrowserContext
let page: Page
let host: HostApi
let eventId: string

test.beforeAll(async ({ browser, baseURL }) => {
  test.setTimeout(90_000) // the first page load of a cold dev server is slow
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

  // A tap circles; nothing is sent until the team's one button is pressed.
  await page.getByRole('button', { name: 'Challenger Deep' }).click()
  await expect(page.getByText(SENT_NOTE)).toHaveCount(0)
  await captureScreen(page, 'question-mc')

  await tapAndSend(page, 'Tonga Trench')
  await expect(page.getByText(SENT_NOTE)).toBeVisible()
  await expect(page.getByRole('button', { name: /Tonga Trench.*sent!/ })).toBeVisible()
  await tapAndSend(page, 'Puerto Rico Trench')
  await expect(page.getByRole('button', { name: /Puerto Rico Trench.*sent!/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Puerto Rico Trench/ })).toHaveAttribute('aria-pressed', 'true')
  await captureScreen(page, 'question-mc-submitted')

  await host.act('host_lock', eventId)
  await expect(page.getByText('Answers locked')).toBeVisible()
  await expect(page.getByRole('button', { name: /Puerto Rico Trench.*sent!/ })).toBeDisabled()
  await captureScreen(page, 'locked')
})

test('a typed answer saves as a draft, survives a reload, and submits', async () => {
  await nextQuestion() // question 2, typed
  const input = page.getByLabel('Our answer')
  await input.fill('octo')
  await expect(page.getByText('Draft saved')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Our answer')).toHaveValue('octo')
  await expectNoAxeViolations(page)

  await page.getByLabel('Our answer').fill('octopus')
  await captureScreen(page, 'question-text')
  await page.getByRole('button', { name: "That's our answer!" }).click()
  await expect(page.getByText(/^Sent! Edit it/)).toBeVisible()
  await expect(page.getByLabel('Our answer')).toHaveValue('octopus')
})

test('true/false and closest number submit', async () => {
  await nextQuestion() // question 3, true/false
  await page.getByRole('button', { name: 'True' }).click()
  await captureScreen(page, 'question-true-false')
  await page.getByRole('button', { name: "That's our answer!" }).click()
  await expect(page.getByRole('button', { name: /True.*sent!/ })).toBeVisible()

  await nextQuestion() // question 4, closest number
  await page.getByLabel('Our guess').fill('nineteen')
  await page.getByRole('button', { name: "That's our answer!" }).click()
  await expect(page.getByRole('alert')).toHaveText('Enter a number, like 1955.')
  await page.getByLabel('Our guess').fill('1955')
  await captureScreen(page, 'question-number')
  await page.getByRole('button', { name: "That's our answer!" }).click()
  await expect(page.getByText(/^Sent! Edit it/)).toBeVisible()
  await expect(page.getByLabel('Our guess')).toHaveValue('1955')
})

test('the countdown counts down, and freezes while paused', async () => {
  await nextQuestion() // question 5, mc, 20 s
  const timer = page.getByRole('timer')
  await expect(timer).toBeVisible()
  const seconds = async () => Number((await timer.textContent())?.match(/\d+/)?.[0])
  expect(await seconds()).toBeLessThanOrEqual(20)

  await host.act('host_pause', eventId)
  await expect(page.getByText('Paused by the host').first()).toBeVisible()
  await captureScreen(page, 'paused')
  const frozen = await seconds()
  await page.waitForTimeout(2000)
  expect(await seconds()).toBe(frozen)
  await expect(page.getByRole('button', { name: 'Bioluminescence' })).toBeDisabled()

  await host.act('host_resume', eventId)
  await expect(page.getByText('Paused by the host')).toHaveCount(0)
  await expect.poll(seconds, { timeout: 5000 }).toBeLessThan(frozen)
})

test('a failed answer says why and keeps the last accepted one', async () => {
  await tapAndSend(page, 'Bioluminescence')
  await expect(page.getByRole('button', { name: /Bioluminescence.*sent!/ })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Fluorescence' }).click() // circles locally, no request
  await page.getByRole('button', { name: 'Send this one instead' }).click()
  // An offline request may hang until the client's 8 s timeout gives up on it.
  await expect(page.getByRole('alert')).toHaveText("Can't reach the game. Check your connection and try again.", { timeout: 12_000 })
  await expect(page.getByRole('button', { name: /Bioluminescence.*sent!/ })).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Send this one instead' }).click()
  await expect(page.getByRole('button', { name: /Fluorescence.*sent!/ })).toBeVisible()
})

test('picture and sound questions show their media, and sound questions their caption', async () => {
  // Skip the rest of round 1, then into round 2 (pictures).
  for (let state = (await host.state(eventId)).state; state.phase !== 'round_break'; state = (await host.state(eventId)).state) {
    if (state.phase === 'live' || state.phase === 'locked') await host.act('host_skip', eventId)
    else await host.act('host_next', eventId)
  }
  await host.act('host_next', eventId)
  await expect(page.getByRole('img', { name: 'Picture for this question' })).toBeVisible()
  await captureScreen(page, 'question-image')

  for (let state = (await host.state(eventId)).state; state.phase !== 'round_break'; state = (await host.state(eventId)).state) {
    if (state.phase === 'live' || state.phase === 'locked') await host.act('host_skip', eventId)
    else await host.act('host_next', eventId)
  }
  await host.act('host_next', eventId)
  await expect(page.locator('audio')).toBeAttached()
  await expect(page.getByRole('button', { name: 'Play the clip' })).toBeVisible()
  const { state } = await host.state(eventId)
  await expect(page.getByText(state.live_payload.caption)).toBeVisible() // captions are on by default
  await captureScreen(page, 'question-audio')
})

test('a captain-only event lets only the captain answer', async ({ browser }) => {
  const captain = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  const crewEvent = await joinAsPlayer(captain, JOIN_CODES.captainOnly, 'Captain Kay')
  await createTeam(captain, 'Captained')
  const crew = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await joinAsPlayer(crew, JOIN_CODES.captainOnly, 'Crew Lee')
  await joinTeam(crew, 'Captained')

  await host.act('host_next', crewEvent)
  await expect(crew.getByText(/Only your captain can answer/)).toBeVisible()
  await expect(crew.getByRole('button', { name: 'Challenger Deep' })).toBeDisabled()
  await expect(crew.getByRole('button', { name: "That's our answer!" })).toHaveCount(0)
  await tapAndSend(captain, 'Challenger Deep')
  await expect(crew.getByText(/Captain Kay sent Challenger Deep for the team/)).toBeVisible()
  await expect(crew.getByRole('button', { name: /Challenger Deep.*sent!/ })).toBeDisabled()
  await captureScreen(crew, 'question-captain-only')
  await host.act('host_lock', crewEvent)
})

test("the nudge appears at 5 s for a circle the team doesn't have", async ({ browser }) => {
  // E2E8A's first question lasts 6 s (scripts/e2e-prepare.ts), so 5 s left comes a second after it opens.
  const nudgePage = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  const nudgeEvent = await joinAsPlayer(nudgePage, JOIN_CODES.nudge, 'Nudge Nick')
  await createTeam(nudgePage, 'Nudged')
  await host.act('host_next', nudgeEvent)
  await nudgePage.getByRole('button', { name: 'Challenger Deep' }).click() // circled, never sent
  await expect(nudgePage.getByText("It's circled, but your team doesn't have it yet. Send it now!")).toBeVisible({ timeout: 2000 })
  await expect(nudgePage.getByText("Don't forget to send!")).toHaveCount(1) // the host says it once, in the stage
  await captureScreen(nudgePage, 'question-mc-nudge')
  await nudgePage.close()
})

test('a long question and long answers fit the sheet at 390px', async ({ browser }) => {
  const stressPage = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  const stressEvent = await joinAsPlayer(stressPage, JOIN_CODES.sheetStress, 'Stress Sam')
  await createTeam(stressPage, 'Long Winded')
  await host.act('host_next', stressEvent)
  await tapAndSend(stressPage, 'A collapsing bubble')
  await expect(stressPage.getByText(SENT_NOTE)).toBeVisible()
  await expectNoHorizontalScroll(stressPage)
  await captureScreen(stressPage, 'question-stress')
  await stressPage.close()
})
