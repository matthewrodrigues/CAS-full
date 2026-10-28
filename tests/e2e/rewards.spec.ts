// Milestone 6 (docs/SPEC.md section 8): prizes with a code and QR, staff redemption, feedback,
// newsletter consent, privacy and account deletion, and the event settings.
import { expect, test } from '@playwright/test'
import { E2E_STAFF_PASSCODE, JOIN_CODES } from './constants'
import { createTeam, expectNoAxeViolations, hostApi, joinAsPlayer, signInViaApi } from './support'

test('the winning player gets prize codes, staff redeem one once, and the player sends feedback', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  const eventId = await joinAsPlayer(phone, JOIN_CODES.rewards, 'Prize Pat')
  await createTeam(phone, 'Prize Winners')
  const host = await hostApi(baseURL!)
  const team = (await host.state(eventId)).host.teams[0]
  await host.post('/api/host_adjust_score', { team_id: team.id, points: 10, note: 'E2E' })
  for (let i = 0; i < 200; i++) {
    const { state } = await host.state(eventId)
    if (state.phase === 'ended') break
    await host.act(['live', 'locked', 'final_live', 'final_locked'].includes(state.phase) ? 'host_skip' : 'host_next', eventId)
  }

  await expect(phone.getByRole('heading', { name: 'Thanks for playing!' })).toBeVisible()
  await phone.getByRole('radio', { name: '4 stars' }).check({ force: true })
  await phone.getByLabel('Anything to tell us? (optional)').fill('Great night')
  await phone.getByRole('button', { name: 'Send feedback' }).click()
  await expect(phone.getByText('Thanks for the feedback!')).toBeVisible()

  await phone.getByLabel('Email', { exact: true }).fill('pat@example.com')
  await phone.getByRole('button', { name: 'Sign me up' }).click()
  await expect(phone.getByRole('alert')).toHaveText('Tick the box to agree first.')
  await phone.getByRole('checkbox').check()
  await phone.getByRole('button', { name: 'Sign me up' }).click()
  await expect(phone.getByText("You're signed up.")).toBeVisible()
  await expectNoAxeViolations(phone)

  await phone.getByRole('link', { name: 'Rewards', exact: true }).click()
  await expect(phone.getByRole('heading', { name: 'Top team prize' })).toBeVisible()
  await expect(phone.getByRole('img', { name: 'QR code for Top team prize' })).toBeVisible()
  const codeText = await phone.getByText(/^Code: [A-Z0-9]{10}$/).first().textContent()
  const code = codeText!.replace('Code: ', '')
  await expectNoAxeViolations(phone)

  const staff = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await signInViaApi(staff, E2E_STAFF_PASSCODE)
  await staff.goto('/staff')
  await staff.getByLabel('Prize code').fill(code.toLowerCase())
  await staff.getByRole('button', { name: 'Redeem', exact: true }).click()
  await expect(staff.getByText(/^Redeemed: .+ for Prize Pat$/)).toBeVisible()
  await staff.getByRole('button', { name: 'Redeem', exact: true }).click()
  await expect(staff.getByRole('alert')).toHaveText('That code has already been redeemed.')
  await expectNoAxeViolations(staff)

  await staff.getByRole('link', { name: 'Codes' }).click()
  await expect(staff.getByText(code, { exact: false }).first()).toBeVisible()
  await staff.getByRole('link', { name: 'Newsletter' }).click()
  const download = staff.waitForEvent('download')
  await staff.getByRole('link', { name: 'Download CSV' }).click()
  expect(await (await download).suggestedFilename()).toBe('newsletter-optins.csv')

  await phone.reload()
  await expect(phone.getByText('Collected')).toBeVisible()
  await host.dispose()
})

test('staff change an event setting', async ({ browser }) => {
  const staff = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage()
  await signInViaApi(staff, E2E_STAFF_PASSCODE)
  await staff.goto('/staff/settings')
  await staff.getByLabel('Event').selectOption({ label: 'DEMO1 · Deep Sea Night' })
  await staff.getByLabel('Live-question background').selectOption('violet')
  await staff.getByRole('button', { name: 'Save settings' }).click()
  await expect(staff.getByText('Saved.')).toBeVisible()
  await staff.reload()
  await staff.getByLabel('Event').selectOption({ label: 'DEMO1 · Deep Sea Night' })
  await expect(staff.getByLabel('Live-question background')).toHaveValue('violet')
  await expectNoAxeViolations(staff)
})

test('the privacy page explains the data and deletes it on request', async ({ browser }) => {
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await joinAsPlayer(phone, JOIN_CODES.join, 'Forget Me') // E2EH1 has ended by now; E2EA1 stays open
  await phone.goto('/privacy')
  await expect(phone.getByRole('heading', { name: 'Privacy' })).toBeVisible()
  await expectNoAxeViolations(phone)
  await phone.getByRole('button', { name: 'Delete my data' }).click()
  await phone.getByRole('button', { name: 'Yes, delete it' }).click()
  await expect(phone.getByText('Your data has been deleted.')).toBeVisible()
  await phone.goto(`/play/${JOIN_CODES.join}`)
  await expect(phone.getByLabel('Your nickname')).toBeVisible()
})
