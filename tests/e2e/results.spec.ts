// Results (docs/SPEC.md sections 5 and 7): reveal, round break, final wager, end, leaderboard, rewards.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { botPlayer, captureScreen, createTeam, expectNoAxeViolations, hostApi, joinAsPlayer, tapAndSend, type HostApi } from './support'

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
  await tapAndSend(page, 'Challenger Deep')
  await expect(page.getByText('Your answer: Challenger Deep')).toBeVisible()
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()
  await expect(page.getByText('+10 points')).toBeVisible()
  await expect(page.getByText('Answer: Challenger Deep')).toBeVisible()
  await expect(page.getByText('Fun fact')).toBeVisible()
  await expectNoAxeViolations(page)

  await host.act('host_next', eventId) // question 2, typed
  await page.getByLabel('Your answer').fill('octopuss')
  await page.getByRole('button', { name: "That's our answer!" }).click()
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
  await tapAndSend(page, 'Incandescence')
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
  await page.getByRole('button', { name: "That's our answer!" }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await lockAndReveal()
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()
  await expect(page.getByText('+20 points')).toBeVisible()
})

test('the end screen shows the final rank, the prizes and what to do next', async () => {
  await host.act('host_next', eventId) // ended
  await expect(page.getByRole('heading', { name: '1st place!' })).toBeVisible()
  await expect(page.getByText('Thanks for playing! Your team finished #1 with 50 points.')).toBeVisible()
  await expect(page.getByRole('link', { name: "Let's name our animal!" })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tell us how tonight went' })).toBeVisible()
  await captureScreen(page, 'ended-prizes')
})

test("the leaderboard tab lists tonight's teams with your own marked", async () => {
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: "Tonight's leaderboard" })).toBeVisible()
  const own = page.locator('li[aria-current="true"]')
  await expect(own).toContainText('Results Rookies')
  await expect(own).toContainText('You')
  await expect(own).toContainText('50 points')
  await captureScreen(page, 'leaderboard-tonight')
})

test('the leaderboard has an empty state, and so do rewards', async ({ browser }) => {
  const fresh = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await joinAsPlayer(fresh, JOIN_CODES.smoke, 'Early Bird')
  // No team yet, so the tab bar is hidden (still joining): open the tab by its address.
  await fresh.goto(`/play/${JOIN_CODES.smoke}/leaderboard`)
  await expect(fresh.getByText('Scores appear once the round starts.')).toBeVisible()
  await captureScreen(fresh, 'leaderboard-empty')
  await fresh.getByRole('link', { name: 'Rewards', exact: true }).click()
  await expect(fresh.getByText('Prizes show up here after the game. Win and your team names an Academy animal. Good luck tonight!')).toBeVisible()
  await expectNoAxeViolations(fresh)
})

test.describe('a full night: 20 teams and a tie for third', () => {
  let night: BrowserContext
  let phone: Page
  let nightId: string
  const OWN = 'The Bioluminescent Know-It-All'
  const SCORES: [string, number][] = [
    ['Hydrothermal Vent Enthusiasts!', 201],
    ['Colossal Squid Appreciators', 187],
    [OWN, 168],
    ['Mariana Trench Coat Collective', 168],
    ...Array.from({ length: 16 }, (_, i): [string, number] => [`Deep Sea Team ${i + 5}`, 160 - i * 8]),
  ]

  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(180_000)
    night = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    phone = await night.newPage()
    nightId = await joinAsPlayer(phone, JOIN_CODES.afterGame, 'Stress Tester')
    await createTeam(phone, OWN)
    const bots = []
    for (const [name] of SCORES.filter(([n]) => n !== OWN)) {
      const bot = await botPlayer(baseURL!, JOIN_CODES.afterGame, `Bot ${bots.length + 1}`)
      await bot.createTeam(name)
      bots.push(bot)
    }
    const view = await host.state(nightId)
    for (const [name, points] of SCORES) {
      const team = view.host.teams.find((t: { name: string }) => t.name === name)
      await host.post('/api/host_adjust_score', { team_id: team.id, points: points - team.score, note: 'E2E setup' })
    }
    for (let i = 0; i < 200 && (await host.state(nightId)).state.phase !== 'ended'; i++) {
      const { state } = await host.state(nightId)
      await host.act(['live', 'locked', 'final_live', 'final_locked'].includes(state.phase) ? 'host_skip' : 'host_next', nightId)
    }
    await Promise.all(bots.map((b) => b.dispose()))
  })

  test.afterAll(async () => {
    await night.close()
  })

  test('a tie for third shows on the end screen, level with the other team', async () => {
    await expect(phone.getByRole('heading', { name: 'Tied for 3rd!' })).toBeVisible()
    await expect(phone.getByText('Thanks for playing! Your team finished #3 with 168 points, level with Mariana Trench Coat Collective.')).toBeVisible()
    await captureScreen(phone, 'ended-prizes-stress')
  })

  test("prize rows show each animal's avatar", async () => {
    const rows = phone.getByRole('list', { name: "Tonight's prizes" }).getByRole('listitem')
    await expect(rows).toHaveCount(4) // places 1 and 2, and both teams tied for 3rd
    const titles = await rows.evaluateAll((items) => items.map((li) => li.querySelector('.char svg title')?.textContent))
    expect(titles).toEqual(['African penguin chick, happy', 'Giant Pacific octopus, happy', 'Pacific seahorse, happy', 'Pacific seahorse, happy'])
    // Tied teams are ordered by name, so find our row by its mark rather than its position.
    const own = rows.and(phone.locator('[aria-current="true"]'))
    await expect(own).toHaveCount(1)
    await expect(own).toContainText('You')
    await expect(own).toContainText('Pacific seahorse')
  })

  test("a long board adds a jump row, and a big crowd gets Rocco's remark", async () => {
    // Drop our team to 11th of 20 (108 points), so it is past the first screenful.
    const team = (await host.state(nightId)).host.teams.find((t: { name: string }) => t.name === OWN)
    await host.post('/api/host_adjust_score', { team_id: team.id, points: 108 - team.score, note: 'E2E setup' })
    await phone.getByRole('link', { name: 'Leaderboard', exact: true }).click()
    await expect(phone.getByText('20 teams! What a crowd!')).toBeVisible()
    await expect(phone.getByText('Final scores for 20 teams.')).toBeVisible()
    const jump = phone.getByRole('link', { name: /You're 11th of 20/ })
    await expect(jump).toContainText(`${OWN} · 108 points`)
    await jump.click()
    await expect(phone.locator('#you-row')).toContainText(OWN)
    await expect(phone.locator('#you-row')).toHaveAttribute('aria-current', 'true')
  })

  test('only the top 3 leaderboard rows show an animal', async () => {
    await phone.getByRole('link', { name: 'Leaderboard', exact: true }).click()
    const rows = phone.getByRole('list', { name: "Tonight's leaderboard" }).getByRole('listitem')
    await expect(rows).toHaveCount(20)
    const shown = await rows.evaluateAll((items) =>
      items.map((li) => ({ rank: Number(li.querySelector('.list-row__rank')?.textContent?.replace(/\D/g, '')), animal: li.querySelectorAll('.char').length })),
    )
    expect(shown.filter((r) => r.rank <= 3).every((r) => r.animal === 1)).toBe(true)
    expect(shown.filter((r) => r.rank > 3).every((r) => r.animal === 0)).toBe(true)
    expect(shown.filter((r) => r.rank <= 3)).toHaveLength(3)
    await captureScreen(phone, 'leaderboard-stress')
  })

  test('the season board lists players without animals, marks you, and has a Tonight / Season switch', async () => {
    await phone.getByRole('link', { name: 'Leaderboard', exact: true }).click()
    await phone.getByRole('link', { name: 'Fall 2026 season' }).click()
    await expect(phone.getByRole('heading', { name: 'Fall 2026 season' })).toBeVisible()
    const rows = phone.getByRole('list', { name: 'Fall 2026 season' }).getByRole('listitem')
    await expect(rows.first()).toContainText('1 night')
    await expect(phone.locator('[aria-current="true"]').filter({ hasText: 'Stress Tester' })).toContainText('You')
    expect(await phone.locator('ol.list .char').count()).toBe(0)
    await captureScreen(phone, 'leaderboard-season')
    await phone.getByRole('link', { name: 'Tonight', exact: true }).click()
    await expect(phone.getByRole('heading', { name: "Tonight's leaderboard" })).toBeVisible()
  })
})
