// Results (docs/SPEC.md sections 5 and 7): reveal, round break, final wager, end, leaderboard, rewards.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { createTeam, expectNoAxeViolations, hostApi, joinAsPlayer, type HostApi } from './support'

test.describe.configure({ mode: 'serial' })

let context: BrowserContext
let page: Page
let host: HostApi
let eventId: string

test.beforeAll(async ({ browser, baseURL }) => {
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  page = await context.newPage()
  eventId = await joinAsPlayer(page, JOIN_CODES.results, 'Res Ult')
  await createTeam(page, 'Results Rookies')
  host = await hostApi(baseURL!)
})

test.afterAll(async () => {
  await host.dispose()
  await context.close()
})

const phase = async () => (await host.state(eventId)).state.phase as string
/** The host's obvious next move, skipping questions, until the game reaches `target`. */
async function skipTo(target: string) {
  for (let p = await phase(); p !== target; p = await phase()) {
    await host.act(p === 'live' || p === 'locked' ? 'host_skip' : 'host_next', eventId)
  }
}
const lockAndReveal = async () => {
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
}

test('a reveal shows the answer, the result in words, the points and the fun fact', async () => {
  await host.act('host_next', eventId) // question 1, mc
  await page.getByRole('button', { name: 'Challenger Deep' }).click()
  await expect(page.getByText('Your answer: Challenger Deep')).toBeVisible()
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()
  await expect(page.getByText('+10 points')).toBeVisible()
  await expect(page.getByText('Answer: Challenger Deep')).toBeVisible()
  await expect(page.getByText('Fun fact')).toBeVisible()
  await expectNoAxeViolations(page)

  await host.act('host_next', eventId) // question 2, typed
  await page.getByLabel('Your answer').fill('octopuss')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'Being checked by the host' })).toBeVisible()

  await host.act('host_next', eventId) // question 3
  await host.act('host_skip', eventId)
  await expect(page.getByRole('heading', { name: 'Question skipped' })).toBeVisible()

  await host.act('host_next', eventId) // question 4, closest number
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'No answer from your team' })).toBeVisible()

  await host.act('host_next', eventId) // question 5, mc
  await page.getByRole('button', { name: 'Incandescence' }).click()
  await expect(page.getByText('Your answer: Incandescence')).toBeVisible()
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'Not this time' })).toBeVisible()
  await expect(page.getByText('Answer: Bioluminescence')).toBeVisible()
})

test('the round break shows the team rank and the top teams', async () => {
  await skipTo('round_break')
  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible()
  await expect(page.getByText('Your team is #1 with 10 points')).toBeVisible()
  await expect(page.getByText('Results Rookies')).toBeVisible()
  await expectNoAxeViolations(page)
})

test('the final wager takes a bet up to the score and shows it during the final question', async () => {
  await skipTo('final_wager')
  const view = await host.state(eventId)
  const team = view.host.teams.find((t: { name: string }) => t.name === 'Results Rookies')
  await host.post('/api/host_adjust_score', { team_id: team.id, points: 30 - team.score, note: 'E2E setup' })
  await expect(page.getByText('Your team has 30 points.')).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByLabel('Your wager').fill('40')
  await page.getByRole('button', { name: 'Lock in wager' }).click()
  await expect(page.getByRole('alert')).toHaveText("You can't bet more points than your team has.")
  await page.getByLabel('Your wager').fill('20')
  await page.getByRole('button', { name: 'Lock in wager' }).click()
  await expect(page.getByText('Your wager: 20')).toBeVisible()

  await host.act('host_next', eventId) // final_live
  await expect(page.getByText('Your wager: 20')).toBeVisible()
  await page.getByLabel('Your answer').fill('bathypelagic')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()
  await expect(page.getByText('+20 points')).toBeVisible()
})

test('the end screen shows the final rank', async () => {
  await host.act('host_next', eventId) // ended
  await expect(page.getByRole('heading', { name: 'Thanks for playing!' })).toBeVisible()
  await expect(page.getByText('Your team finished #1 with 50 points.')).toBeVisible()
})

test("the leaderboard tab lists tonight's teams with your own marked", async () => {
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: "Tonight's leaderboard" })).toBeVisible()
  const own = page.locator('li[aria-current="true"]')
  await expect(own).toContainText('Results Rookies')
  await expect(own).toContainText('(your team)')
  await expect(own).toContainText('50 pts')
  await expectNoAxeViolations(page)
})

test('the leaderboard has an empty state, and so do rewards', async ({ browser }) => {
  const fresh = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await joinAsPlayer(fresh, JOIN_CODES.smoke, 'Early Bird')
  await fresh.getByRole('link', { name: 'Leaderboard', exact: true }).click()
  await expect(fresh.getByText('Scores appear once the round starts.')).toBeVisible()
  await fresh.getByRole('link', { name: 'Rewards', exact: true }).click()
  await expect(fresh.getByText('Prizes show up here after the game. Good luck tonight!')).toBeVisible()
  await expectNoAxeViolations(fresh)
})
