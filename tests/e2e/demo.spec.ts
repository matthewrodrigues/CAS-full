// The demo quickstart (docs/superpowers/specs/2026-11-17-demo-quickstart-design.md): on DEMO1 the
// host console has a Demo card that restarts the demo and runs it on autopilot. Other specs load
// DEMO1 too, so every test here restarts it first and leaves it back in the lobby.
import { expect, test, type Browser, type Page } from '@playwright/test'
import { E2E_HOST_PASSCODE, JOIN_CODES } from './constants'
import { createTeam, expectNoAxeViolations, joinAsPlayer, signInViaApi } from './support'

test.describe.configure({ mode: 'serial' })

const phoneOf = (browser: Browser) => browser.newContext({ viewport: { width: 390, height: 844 } }).then((c) => c.newPage())

async function demoConsole(browser: Browser, eventId: string) {
  const page = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage()
  await signInViaApi(page, E2E_HOST_PASSCODE)
  await page.goto(`/host/${eventId}`)
  await expect(page.getByRole('heading', { name: 'Demo', exact: true })).toBeVisible()
  return page
}

async function restart(console_: Page) {
  await console_.getByRole('button', { name: 'Restart demo' }).click()
  await console_.getByRole('button', { name: 'Yes, restart' }).click()
  await expect(console_.getByText('The demo is back in the lobby.')).toBeVisible()
}

test('restart sends everyone back to the lobby', async ({ browser }) => {
  const phone = await phoneOf(browser)
  const eventId = await joinAsPlayer(phone, JOIN_CODES.demo, 'Demo Dee')
  const console_ = await demoConsole(browser, eventId)
  await restart(console_)
  await createTeam(phone, 'Demo Divers')
  await expectNoAxeViolations(console_)

  await console_.getByRole('button', { name: 'Start the game' }).click()
  await expect(phone.getByText('Question live').first()).toBeVisible({ timeout: 15_000 })

  await console_.getByRole('button', { name: 'Restart demo' }).click()
  await expect(console_.getByText("Restart the demo? Everyone's scores and teams are cleared.")).toBeVisible()
  await console_.getByRole('button', { name: 'Yes, restart' }).click()
  await expect(console_.getByText('The demo is back in the lobby.')).toBeVisible()
  // The team is gone, so the phone is back on the team screen, without a reload.
  await expect(phone.getByLabel('Team name')).toBeVisible({ timeout: 15_000 })
  await expect(console_.getByRole('button', { name: 'Start the game' })).toBeVisible()
})

test('autopilot plays on without host presses', async ({ browser }) => {
  test.setTimeout(120_000)
  const phone = await phoneOf(browser)
  const eventId = await joinAsPlayer(phone, JOIN_CODES.demo, 'Demo Pat')
  const console_ = await demoConsole(browser, eventId)
  await restart(console_)
  await createTeam(phone, 'Pilot Crew')

  const autopilot = console_.getByRole('switch', { name: 'Autopilot' })
  await expect(autopilot).toHaveAttribute('aria-checked', 'false')
  await autopilot.click()
  await expect(autopilot).toHaveAttribute('aria-checked', 'true')
  await expect(console_.getByText('Autopilot is on: it reveals and moves on by itself.')).toBeVisible()

  await console_.getByRole('button', { name: 'Start the game' }).click()
  await expect(phone.getByText('Question live').first()).toBeVisible({ timeout: 15_000 })
  // No more host presses: the question locks on its timer, then autopilot reveals and moves on.
  await expect(phone.getByText('Results are in').first()).toBeVisible({ timeout: 60_000 })
  await expect(phone.getByText('Question live').first()).toBeVisible({ timeout: 30_000 })

  await autopilot.click()
  await expect(autopilot).toHaveAttribute('aria-checked', 'false')
  await restart(console_)
})

test("other events don't get the Demo card", async ({ browser }) => {
  // Opened from the host's event list: host.spec may have ended this event, so a player can't join it.
  const page = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage()
  await signInViaApi(page, E2E_HOST_PASSCODE)
  await page.goto('/host')
  await page.getByRole('link', { name: `Run ${JOIN_CODES.host}` }).click()
  await expect(page.getByRole('heading', { name: `Host console · ${JOIN_CODES.host}` })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Demo', exact: true })).toHaveCount(0)
})
