// Milestone 3 done-when (docs/SPEC.md section 8): a host over the API and a player in the browser
// play three questions end to end; and a dropped connection catches up without a reload.
import { expect, test } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { createTeam, hostApi, joinAsPlayer } from './support'

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
  await page.getByRole('button', { name: 'Challenger Deep' }).click()
  await expect(page.getByText('Your answer: Challenger Deep')).toBeVisible()
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // Question 2, typed: the clock locks it (30 s + 1.2 s grace).
  await host.act('host_next', eventId)
  await page.getByLabel('Your answer').fill('octopus')
  await page.getByRole('button', { name: 'Submit answer' }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Answers are locked' })).toBeVisible({ timeout: 40_000 })
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // Question 3, true/false (False is right).
  await host.act('host_next', eventId)
  await page.getByRole('button', { name: 'False' }).click()
  await expect(page.getByText('Your answer: False')).toBeVisible()
  await host.act('host_lock', eventId)
  await host.act('host_reveal', eventId)
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible()

  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click()
  await expect(page.locator('li[aria-current="true"]')).toContainText('E2E Divers')
  await expect(page.locator('li[aria-current="true"]')).toContainText('30 pts')
  await host.dispose()
  await context.close()
})

test('the screen catches up after a dropped connection', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const eventId = await joinAsPlayer(page, JOIN_CODES.playThree, 'Off Line')
  await page.getByRole('button', { name: 'Join E2E Divers' }).click()
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
