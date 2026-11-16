// Milestone 4 done-when (docs/SPEC.md section 8): a full night hosted from a tablet while the
// display runs in another browser, with a player on a phone.
import { expect, test, type Browser } from '@playwright/test'
import { E2E_HOST_PASSCODE, JOIN_CODES } from './constants'
import { botPlayer, captureScreen, createTeam, tapAndSend, expectNoAxeViolations, hostApi, joinAsPlayer, signInViaApi, type HostApi } from './support'

const tablet = (browser: Browser) => browser.newContext({ viewport: { width: 1024, height: 768 } }).then((c) => c.newPage())

test('the host passcode screen refuses a wrong passcode and lists events for the right one', async ({ browser }) => {
  const page = await tablet(browser)
  await page.goto('/host')
  await expect(page.getByRole('heading', { name: 'Host sign-in' })).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByLabel('Passcode').fill('not-it')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText("That passcode didn't work.")
  await page.getByLabel('Passcode').fill(E2E_HOST_PASSCODE)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('link', { name: `Run ${JOIN_CODES.host}` })).toBeVisible()
})

test('a staff page asks for the staff passcode', async ({ page }) => {
  await page.goto('/staff')
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible()
})

test('a full night hosted from the console while the big screen follows', async ({ browser }) => {
  test.setTimeout(240_000)
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await joinAsPlayer(phone, JOIN_CODES.host, 'Tab Lee')
  await createTeam(phone, 'Console Crew')

  const console_ = await tablet(browser)
  await signInViaApi(console_, E2E_HOST_PASSCODE)
  await console_.goto('/host')
  await console_.getByRole('link', { name: `Run ${JOIN_CODES.host}` }).click()
  await expect(console_.getByRole('heading', { name: `Host console · ${JOIN_CODES.host}` })).toBeVisible()
  await console_.getByRole('button', { name: 'Approve Console Crew' }).click()
  await expect(console_.getByText('Approved ·')).toBeVisible()
  await expectNoAxeViolations(console_)

  // The projector runs in the same host session (its own window in real life).
  const display = await console_.context().newPage()
  await display.goto(console_.url() + '/display')
  await expect(display.getByRole('img', { name: 'QR code to join the game' })).toBeVisible()
  await expect(display.getByText(JOIN_CODES.host, { exact: true })).toBeVisible()
  await expectNoAxeViolations(display)

  const primary = (name: string) => console_.getByRole('button', { name, exact: true }).click()

  // Question 1: multiple choice, counted, locked and revealed from the console.
  await primary('Start the game')
  await expect(display.getByRole('heading', { name: "What is the deepest known point in Earth's oceans?" })).toBeVisible()
  await tapAndSend(phone, 'Challenger Deep')
  await expect(console_.getByText('1 of 1 teams answered')).toBeVisible()
  await primary('Lock answers')
  await primary('Reveal the answer')
  await expect(display.locator('.option--answer')).toContainText('Challenger Deep')
  await expect(phone.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // Question 2: a borderline typed answer, accepted from the review queue before the reveal.
  await primary('Next')
  await phone.getByLabel('Your answer').fill('octopuss')
  await phone.getByRole('button', { name: "That's our answer!" }).click()
  await expect(phone.getByText('Submitted', { exact: true })).toBeVisible()
  await primary('Lock answers')
  await expect(console_.getByText('Console Crew: “octopuss” (70% match)')).toBeVisible()
  await console_.getByRole('button', { name: 'Accept Console Crew’s answer' }).click()
  await expect(console_.getByText('Nothing to check.')).toBeVisible()
  await primary('Reveal the answer')
  await expect(phone.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // Pause and resume, a skip, and a score adjustment.
  await primary('Next')
  await console_.getByRole('button', { name: 'Pause' }).click()
  await expect(phone.getByText('Paused by the host')).toBeVisible()
  await expect(display.getByText('Paused by the host')).toBeVisible()
  await primary('Resume')
  await console_.getByRole('button', { name: 'Skip question' }).click()
  await expect(display.getByRole('heading', { name: 'Question skipped' })).toBeVisible()
  await console_.getByText('Adjust Console Crew’s score').click()
  await console_.getByLabel('Points (+ or −)').fill('5')
  await console_.getByLabel('Reason').fill('Best costume')
  await console_.getByRole('button', { name: 'Apply' }).click()
  await expect(console_.getByText('25 pts')).toBeVisible()

  // The rest of the night: skip each question, advancing through round breaks and the wager.
  const over = console_.getByText('The game is over.')
  const advance = console_.getByRole('button', { name: /^(Skip question|Next|Start the next round|Open the final question|End the game)$/ }).first()
  for (let i = 0; i < 200; i++) {
    await expect(advance.or(over)).toBeVisible()
    if (await over.isVisible()) break
    // The button can vanish mid-click as the phase moves on; go round again.
    await advance.click({ timeout: 5000 }).catch(() => {})
  }
  await expect(console_.getByText('The game is over.')).toBeVisible()
  await expect(display.getByRole('heading', { name: 'Final scores' })).toBeVisible()
  await expect(display.getByText('Console Crew')).toBeVisible()
  await expect(phone.getByRole('heading', { name: 'Thanks for playing!' })).toBeVisible()
})

// The room display at 1920x1080 (design/screens/big-*.html). The project default is a phone, so
// these tests open their own wide page.
const TEAM_NAMES = ['The Anglerfish Five', 'Kelp Me If You Can', 'Squid Game Night', 'Mola Mola Mavericks', 'Pressure Drop', 'Trench Coats', 'The Yeti Crabs', 'Krill Seekers', 'Whale Hello There']

async function bigScreen(browser: Browser, eventId: string) {
  const page = await browser.newContext({ viewport: { width: 1920, height: 1080 } }).then((c) => c.newPage())
  await signInViaApi(page, E2E_HOST_PASSCODE)
  await page.goto(`/host/${eventId}/display`)
  return page
}

/** Fills the event with approved teams, so the room display has names to show. */
async function fillTeams(baseURL: string, host: HostApi, count: number) {
  let eventId = ''
  const teamIds: string[] = []
  for (const [i, name] of TEAM_NAMES.slice(0, count).entries()) {
    const bot = await botPlayer(baseURL, JOIN_CODES.bigScreen, `Captain ${i + 1}`)
    eventId = bot.eventId
    const teamId = await bot.createTeam(name)
    await host.post('/api/host_review_team_name', { team_id: teamId, name_status: 'approved' })
    teamIds.push(teamId)
    await bot.dispose()
  }
  return { eventId, teamIds }
}

/** Skips and advances until the game reaches `phase`. */
async function advanceTo(host: HostApi, eventId: string, phase: string) {
  for (let i = 0; i < 80; i++) {
    const state = (await host.state(eventId)).state.phase
    if (state === phase) return
    await host.act(state === 'live' || state === 'locked' || state === 'final_live' || state === 'final_locked' ? 'host_skip' : 'host_next', eventId)
  }
  throw new Error(`never reached ${phase}`)
}

test('every big-screen phase matches its design at 1920x1080', async ({ browser, baseURL }) => {
  test.setTimeout(420_000)
  const host = await hostApi(baseURL!)
  const { eventId, teamIds } = await fillTeams(baseURL!, host, 9)
  // Distinct scores, so the top three (and only they) show the animal they would name.
  for (const [i, points] of [30, 20, 10].entries()) await host.post('/api/host_adjust_score', { team_id: teamIds[i], points, note: 'Big screen test' })
  const screen = await bigScreen(browser, eventId)

  // Lobby: the QR, the join words and the code, with the host greeting.
  await expect(screen.getByRole('img', { name: 'QR code to join the game' })).toBeVisible()
  await expect(screen.getByRole('heading', { name: 'Join on your phone' })).toBeVisible()
  await expect(screen.getByText(JOIN_CODES.bigScreen, { exact: true })).toBeVisible()
  await expect(screen.getByRole('heading', { name: '9 teams joined' })).toBeVisible()
  await expect(screen.locator('.big .screen--big.screen--night')).toBeVisible()
  await expect(screen.getByText('Waiting for the host')).toBeVisible()
  await captureScreen(screen, 'big-lobby')

  // A question: the paper, its options, the ring and how many teams have answered.
  await host.act('host_next', eventId)
  await expect(screen.getByRole('heading', { name: "What is the deepest known point in Earth's oceans?" })).toBeVisible()
  await expect(screen.getByText('Question live')).toBeVisible()
  await expect(screen.getByRole('timer')).toBeVisible()
  await expect(screen.getByText('Question 1 of 10')).toBeVisible()
  await expect(screen.getByText('0 of 9 teams have sent an answer')).toBeVisible()
  await expect(screen.getByText('Round 1 of 4 · Late? Join with code E2E10')).toBeVisible()
  await captureScreen(screen, 'big-question')

  await host.act('host_lock', eventId)
  await expect(screen.getByText('Answers locked').first()).toBeVisible()
  await expect(screen.getByText("Time's up!")).toBeVisible()
  await expect(screen.getByText('Round 1 of 4', { exact: true })).toBeVisible()
  await captureScreen(screen, 'big-locked')

  await host.act('host_reveal', eventId)
  await expect(screen.getByText('Results are in')).toBeVisible()
  await expect(screen.locator('.option--answer')).toContainText('Challenger Deep')
  await captureScreen(screen, 'big-reveal')

  // The round break: the standings page through (8 rows, then 1), then the next host takes over.
  await advanceTo(host, eventId, 'round_break')
  await expect(screen.getByText('Teams 1–8 of 9 · page 1 of 2')).toBeVisible()
  await expect(screen.locator('.list-row')).toHaveCount(8)
  await expect(screen.locator('.list-row .char')).toHaveCount(3)
  await expect(screen.getByRole('heading', { name: 'Round 1 complete' })).toBeVisible()
  await captureScreen(screen, 'big-leaderboard')
  await expect(screen.getByText('Teams 9–9 of 9 · page 2 of 2')).toBeVisible({ timeout: 15_000 })
  await expect(screen.getByRole('heading', { name: /taking Round 2!$/ })).toBeVisible({ timeout: 15_000 })
  await expect(screen.getByRole('heading', { name: 'Who Lives Down There?' })).toBeVisible()
  await captureScreen(screen, 'big-round-intro')

  // The end: final scores, then the animals the top three name.
  await advanceTo(host, eventId, 'ended')
  await expect(screen.getByRole('heading', { name: 'Final scores' })).toBeVisible()
  await expect(screen.locator('.list-row')).toHaveCount(8)
  await expect(screen.getByRole('heading', { name: "Tonight's top teams name an Academy animal" })).toBeVisible({ timeout: 30_000 })
  await expect(screen.locator('.list-row')).toHaveCount(3)
  await expect(screen.locator('.list-row__sub').first()).toContainText('Names the')
  await captureScreen(screen, 'big-prizes')
  await host.dispose()
})

test("the big screen shows the round's host", async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const host = await hostApi(baseURL!)
  const bot = await botPlayer(baseURL!, JOIN_CODES.bigScreenHost, 'Host Watcher')
  const screen = await bigScreen(browser, bot.eventId)
  const names: Record<string, string> = { rocco: 'Rocco the raccoon', pebble: 'Pebble the penguin', june: 'Dr. June' }
  // The lobby is always Rocco's; once the round starts, whoever the server cast for it.
  await expect(screen.getByRole('img', { name: /^Rocco the raccoon,/ })).toBeVisible()
  if ((await host.state(bot.eventId)).state.phase === 'lobby') await host.act('host_next', bot.eventId)
  const cast = (await host.state(bot.eventId)).cast
  await expect(screen.getByRole('heading', { name: "What is the deepest known point in Earth's oceans?" })).toBeVisible()
  await expect(screen.locator('.stage').getByRole('img', { name: new RegExp(`^${names[cast.host]},`) })).toBeVisible()
  await bot.dispose()
  await host.dispose()
})
