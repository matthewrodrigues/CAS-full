// Milestone 3 done-when (docs/SPEC.md section 8): a host over the API and a player in the browser
// play three questions end to end; and a dropped connection catches up without a reload.
import { expect, test } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { captureScreen, createTeam, tapAndSend, hostApi, joinAsPlayer, joinTeam } from './support'

test.describe.configure({ mode: 'serial' })

test('a host over the API and a player in the browser play three questions', async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const eventId = await joinAsPlayer(page, JOIN_CODES.playThree, 'Dee Diver')
  await createTeam(page, 'E2E Divers')
  const host = await hostApi(baseURL!)
  const team = (await host.state(eventId)).host.teams.find((t: { name: string }) => t.name === 'E2E Divers')
  await host.post('/api/host_review_team_name', { team_id: team.id, name_status: 'approved' })
  await expect(page.getByText('Team name approved')).toBeVisible()

  // Question 1, multiple choice: locked by the host.
  await host.act('host_next', eventId)
  await tapAndSend(page, 'Challenger Deep')
  await expect(page.getByRole('button', { name: /Challenger Deep.*sent!/ })).toBeVisible()
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct!' })).toBeVisible()
  await expect(page.getByText('+10 points for your team!')).toBeVisible()
  await captureScreen(page, 'reveal-correct')

  // Question 2, typed: the clock locks it (30 s + 1.2 s grace).
  await host.act('host_next', eventId)
  await page.getByLabel('Our answer').fill('octopus')
  await page.getByRole('button', { name: "That's our answer!" }).click()
  await expect(page.getByText(/^Sent! Edit it/)).toBeVisible()
  await expect(page.getByText('Answers locked')).toBeVisible({ timeout: 40_000 })
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // Question 3, true/false (False is right).
  await host.act('host_next', eventId)
  await tapAndSend(page, 'False')
  await expect(page.getByRole('button', { name: /False.*sent!/ })).toBeVisible()
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // The tab bar is hidden on a reveal (it's an in-flow sheet), so open the tab by its address.
  await page.goto(`/play/${JOIN_CODES.playThree}/leaderboard`)
  await expect(page.locator('li[aria-current="true"]')).toContainText('E2E Divers')
  await expect(page.locator('li[aria-current="true"]')).toContainText('30 points')
  await host.dispose()
  await context.close()
})

test('the screen catches up after a dropped connection', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const eventId = await joinAsPlayer(page, JOIN_CODES.playThree, 'Off Line')
  await joinTeam(page, 'E2E Divers')
  const host = await hostApi(baseURL!)
  await host.act('host_next', eventId) // question 4
  await expect(page.getByRole('timer')).toBeVisible()

  await context.setOffline(true)
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await context.setOffline(false)
  await expect(page.getByRole('heading', { name: 'No answer from your team' })).toBeVisible({ timeout: 15_000 })
  await host.dispose()
  await context.close()
})

// The moments between questions: a wrong answer, the round break with its new host, the final wager.
test('round break introduces the incoming host (after a wrong answer, before the final wager)', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const eventId = await joinAsPlayer(page, JOIN_CODES.sheetRounds, 'Round Robin')
  await createTeam(page, 'Round Trippers')
  const host = await hostApi(baseURL!)
  const skipTo = async (phase: string) => {
    for (;;) {
      const { state } = await host.state(eventId)
      if (state.phase === phase) return
      if (['live', 'locked', 'final_live', 'final_locked'].includes(state.phase)) await host.act('host_skip', eventId)
      else await host.act('host_next', eventId)
    }
  }

  // Question 1 right (10 points, so there is something to wager), question 3 wrong.
  await host.act('host_next', eventId)
  await tapAndSend(page, 'Challenger Deep')
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct!' })).toBeVisible()
  await host.act('host_next', eventId) // question 2
  await host.act('host_skip', eventId)
  await host.act('host_next', eventId) // question 3, true/false (False is right)
  await tapAndSend(page, 'True')
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible()
  await expect(page.getByText('No points this time')).toBeVisible()
  await captureScreen(page, 'reveal-incorrect')

  // Round 1 ends: the incoming host greets the team, the outgoing host hands over, small.
  await skipTo('round_break')
  const { cast } = await host.state(eventId)
  const names = { rocco: 'Rocco the raccoon', pebble: 'Pebble the penguin', june: 'Dr. June' } as const
  await expect(page.getByRole('img', { name: `${names[cast.incoming_host as keyof typeof names]}, waving hello` })).toBeVisible()
  await expect(page.getByRole('img', { name: `${names[cast.host as keyof typeof names]}, relaxing` })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible()
  await captureScreen(page, 'round-break')

  // On to the final wager: the final round's host asks how much to bet.
  await skipTo('final_wager')
  await expect(page.getByText('Place your wager')).toBeVisible()
  await page.getByLabel('Our wager').fill('10')
  await captureScreen(page, 'wager')
  await page.getByLabel('Our wager').fill('11')
  await page.getByRole('button', { name: 'Lock in our wager' }).click()
  await expect(page.getByRole('alert')).toHaveText('Pick a whole number from 0 to 10.')
  await page.getByLabel('Our wager').fill('10')
  await page.getByRole('button', { name: 'Lock in our wager' }).click()
  await expect(page.getByText(/^Wager locked in!/)).toBeVisible()
  await host.dispose()
  await context.close()
})
