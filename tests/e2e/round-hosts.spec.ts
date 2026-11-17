// Round hosts (Task 11): staff choose who hosts each round, the host console can still change
// the next round's host during a break, and a round that has started can't be changed.
import { expect, test, type Browser, type Page } from '@playwright/test'
import { E2E_HOST_PASSCODE, E2E_STAFF_PASSCODE, JOIN_CODES } from './constants'
import { advanceTo as skipTo, captureScreen, hostApi, signInViaApi } from './support'

async function eventIdFor(page: Page, code: string): Promise<string> {
  const res = await page.context().request.get('/api/host_events')
  const { events } = await res.json()
  return events.find((e: { join_code: string }) => e.join_code === code).id
}

async function staffSettings(browser: Browser, code: string) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await signInViaApi(page, E2E_STAFF_PASSCODE)
  await page.goto('/staff/settings')
  const value = await page.locator('option', { hasText: code }).first().getAttribute('value')
  await page.getByLabel('Event', { exact: true }).selectOption(value!)
  await expect(page.getByRole('heading', { name: 'Round hosts' })).toBeVisible()
  return page
}

async function hostConsole(browser: Browser, code: string) {
  const page = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage()
  await signInViaApi(page, E2E_HOST_PASSCODE)
  await page.goto('/host')
  await page.getByRole('link', { name: `Run ${code}` }).click()
  await expect(page.getByRole('heading', { name: `Host console · ${code}` })).toBeVisible()
  return page
}

test('staff sets round 2\'s host to Pebble and the round break shows Pebble', async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  const code = JOIN_CODES.roundHostsStaff
  const staff = await staffSettings(browser, code)
  const round2 = staff.getByRole('group', { name: /Round 2/ })
  await round2.locator('label.choice', { hasText: 'Pebble' }).click()
  // Round 1 fixed to Rocco: were it Pebble too, Pebble would keep the stage and there'd be no hand-over.
  await staff.getByRole('group', { name: /Round 1/ }).locator('label.choice', { hasText: 'Rocco' }).click()
  await staff.getByRole('button', { name: 'Save round hosts' }).click()
  await expect(staff.getByText('Saved! Round hosts are set.')).toBeVisible()
  await captureScreen(staff, 'staff-round-hosts')
  await staff.reload()
  await staff.getByLabel('Event', { exact: true }).selectOption(await staff.locator('option', { hasText: code }).first().getAttribute('value'))
  await expect(staff.getByRole('group', { name: /Round 2/ }).getByRole('radio', { name: 'Pebble' })).toBeChecked()

  const host = await hostApi(baseURL!)
  const consolePage = await hostConsole(browser, code)
  const eventId = await eventIdFor(consolePage, code)
  await skipTo(host, eventId, 'round_break')
  const view = await host.state(eventId)
  expect(view.cast.incoming_host).toBe('pebble')
  await expect(consolePage.getByLabel("Next round's host")).toHaveValue('pebble')
  await host.dispose()
})

test('host console can change the next round\'s host during a break', async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  const code = JOIN_CODES.roundHostsConsole
  const host = await hostApi(baseURL!)
  const consolePage = await hostConsole(browser, code)
  const eventId = await eventIdFor(consolePage, code)
  // The lobby already offers the control (round 1 is next).
  await expect(consolePage.getByLabel("Next round's host")).toHaveValue('random')
  await skipTo(host, eventId, 'round_break')
  const select = consolePage.getByLabel("Next round's host")
  await expect(select).toBeVisible()
  // Not round 1's host: a host who keeps the stage isn't handed over to (incoming_host stays null).
  const choice = (await host.state(eventId)).cast.host === 'june' ? 'pebble' : 'june'
  await select.selectOption(choice)
  await expect(select).toHaveValue(choice)
  await expect.poll(async () => (await host.state(eventId)).cast.incoming_host).toBe(choice)
  await captureScreen(consolePage, 'host-console-round-break')
  // Once the round starts there is nothing left to change.
  await host.act('host_next', eventId)
  await expect(consolePage.getByLabel("Next round's host")).toHaveCount(0)
  await host.dispose()
})

test('a started round\'s host can\'t be changed', async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  const code = JOIN_CODES.roundHostsStarted
  const host = await hostApi(baseURL!)
  const staff = await staffSettings(browser, code)
  const eventId = await eventIdFor(staff, code)
  await skipTo(host, eventId, 'round_break')
  await staff.reload()
  await staff.getByLabel('Event', { exact: true }).selectOption(await staff.locator('option', { hasText: code }).first().getAttribute('value'))
  const round1 = staff.getByRole('group', { name: /Round 1/ })
  await expect(round1.getByRole('radio', { name: 'Pebble' })).toBeDisabled()
  await expect(round1.getByText(/Started/)).toBeVisible()
  await expect(staff.getByRole('group', { name: /Round 2/ }).getByRole('radio', { name: 'Pebble' })).toBeEnabled()

  // Another session starts round 2 while this page is open: saving gets a friendly message.
  await staff.getByRole('group', { name: /Round 2/ }).locator('label.choice', { hasText: 'Pebble' }).click()
  await host.act('host_next', eventId)
  await staff.getByRole('button', { name: 'Save round hosts' }).click()
  await expect(staff.getByRole('alert')).toHaveText("That round has started, so its host can't change now.")
  await host.dispose()
})
