// Joining (docs/SPEC.md section 3, /play/:joinCode): nickname, create or join a team, lobby.
import { expect, test } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { createTeam, expectNoAxeViolations, expectNoHorizontalScroll, hostApi, joinAsPlayer } from './support'

const code = JOIN_CODES.join

test.describe.configure({ mode: 'serial' }) // the tests share E2EA1 and run in order

test('a player joins with a nickname and creates a team', async ({ page }) => {
  await page.goto(`/play/${code}`)
  await expect(page.getByRole('heading', { name: 'Join the game' })).toBeVisible()
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)

  await joinAsPlayer(page, code, 'Ana')
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toBeVisible()
  await expectNoAxeViolations(page)

  await createTeam(page, 'Reef Raiders')
  await expect(page.getByText('Waiting for the host to start')).toBeVisible()
  await expect(page.getByText('1 player', { exact: true })).toBeVisible()
  await expect(page.getByText('Ana', { exact: true })).toBeVisible()
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)
})

test('a second player joins that team from the list, and both lobbies update', async ({ browser }) => {
  const first = await browser.newPage()
  await joinAsPlayer(first, code, 'Cy')
  await createTeam(first, 'Kelp Crew')

  const second = await browser.newPage()
  await joinAsPlayer(second, code, 'Dee')
  await second.getByRole('button', { name: 'Join Kelp Crew' }).click()
  await expect(second.getByRole('heading', { name: 'Kelp Crew' })).toBeVisible()
  await expect(second.getByText('2 players', { exact: true })).toBeVisible()
  await expect(first.getByText('2 players', { exact: true })).toBeVisible()
  await expect(first.getByText('Dee', { exact: true })).toBeVisible()
})

test('a returning player lands back in the lobby after a reload', async ({ page }) => {
  await joinAsPlayer(page, code, 'Eli')
  await createTeam(page, 'Tide Pool')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tide Pool' })).toBeVisible()
  await expect(page.getByLabel('Your nickname')).toHaveCount(0)
})

test('an unknown join code says so', async ({ page }) => {
  await page.goto('/play/ZZZZ9')
  await page.getByLabel('Your nickname').fill('Lost')
  await page.getByRole('button', { name: 'Join the game' }).click()
  await expect(page.getByRole('alert')).toHaveText("We can't find that game. Check the code on the big screen.")
})

test('a nickname the filter rejects asks for another', async ({ page }) => {
  await page.goto(`/play/${code}`)
  await page.getByLabel('Your nickname').fill('shithead')
  await page.getByRole('button', { name: 'Join the game' }).click()
  await expect(page.getByRole('alert')).toHaveText('Please pick a different nickname.')
})

test('a player who joins after the first question opens gets the team screen', async ({ page, baseURL }) => {
  const eventId = await joinAsPlayer(page, code, 'Late Lou')
  const host = await hostApi(baseURL!)
  await host.act('host_next', eventId)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toBeVisible()
  await expect(page.getByText('The game has started. You can still join a team.')).toBeVisible()
  await page.getByLabel('Team name').fill('Latecomers')
  await page.getByRole('button', { name: 'Create team' }).click()
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toHaveCount(0)
  await host.dispose()
})
