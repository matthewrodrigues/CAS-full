// Milestone 6 (docs/SPEC.md section 8), as redesigned: the only prize is naming an animal. Naming and staff
// approval, following the animal, feedback, newsletter consent, privacy and account deletion, and the event settings.
import { expect, test } from '@playwright/test'
import { E2E_STAFF_PASSCODE, JOIN_CODES } from './constants'
import { captureScreen, createTeam, expectNoAxeViolations, hostApi, joinAsPlayer, signInViaApi } from './support'

test('the winning team names an Academy animal, staff approve it, and the player follows its updates', async ({ browser, baseURL }) => {
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

  await expect(phone.getByRole('heading', { name: '1st place!' })).toBeVisible()
  await expect(phone.getByRole('list', { name: "Tonight's prizes" }).getByRole('listitem')).toContainText('African penguin chick')

  await phone.getByRole('link', { name: 'Tell us how tonight went' }).click()
  await expect(phone.getByRole('heading', { name: 'How was tonight?' })).toBeVisible()
  await captureScreen(phone, 'feedback')
  await phone.getByRole('radio', { name: '4 stars' }).check({ force: true })
  await phone.getByLabel('Anything to tell us? (optional)').fill('Great night')
  await phone.getByRole('button', { name: 'Send my feedback' }).click()
  await expect(phone.getByText('Thanks for the feedback!')).toBeVisible()

  await phone.getByLabel('Email', { exact: true }).fill('pat@example.com')
  await phone.getByRole('button', { name: 'Sign me up' }).click()
  await expect(phone.getByRole('alert')).toHaveText('Tick the box to agree first.')
  await phone.getByRole('checkbox').check({ force: true })
  await phone.getByRole('button', { name: 'Sign me up' }).click()
  await expect(phone.getByText("You're signed up.")).toBeVisible()
  await expectNoAxeViolations(phone)

  await phone.getByRole('link', { name: 'Play', exact: true }).click()
  await phone.getByRole('link', { name: "Let's name our penguin chick!" }).click()
  await expect(phone.getByRole('heading', { name: 'Name the African penguin chick' })).toBeVisible()
  await expect(phone.getByText('Your team won the right to name this animal!')).toBeVisible()
  await expect(phone.getByText('Code:')).toHaveCount(0) // no prize codes on a player screen
  await captureScreen(phone, 'rewards')
  await phone.getByLabel("Your team's name for it").fill('Sir Waddles')
  await phone.getByRole('button', { name: "That's our name!" }).click()
  await expect(phone.getByText('“Sir Waddles” is with Academy staff for approval.')).toBeVisible()
  await expectNoAxeViolations(phone)

  const staff = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await signInViaApi(staff, E2E_STAFF_PASSCODE)
  await staff.goto('/staff/animals')
  await staff.getByRole('button', { name: 'Approve the name Sir Waddles' }).click()
  await expect(staff.getByText('Sir Waddles · African penguin chick').first()).toBeVisible()
  const waddles = staff.getByRole('listitem').filter({ has: staff.getByLabel('New update about Sir Waddles · African penguin chick') })
  await waddles.getByRole('textbox').fill('Sir Waddles took a first swim today.')
  await waddles.getByRole('button', { name: 'Post update' }).click()
  await expect(waddles.getByText('Posted.')).toBeVisible()
  await expectNoAxeViolations(staff)

  await staff.getByRole('link', { name: 'Newsletter' }).click()
  const download = staff.waitForEvent('download')
  await staff.getByRole('link', { name: 'Download CSV' }).click()
  expect(await (await download).suggestedFilename()).toBe('newsletter-optins.csv')

  await phone.reload()
  await expect(phone.getByText('Approved! The animal is now called Sir Waddles.')).toBeVisible()
  await phone.getByRole('link', { name: 'Show me my animal' }).click()
  await expect(phone.getByRole('heading', { name: 'Sir Waddles' })).toBeVisible()
  await expect(phone.getByText('Sir Waddles took a first swim today.')).toBeVisible()
  await expect(phone.getByRole('button', { name: 'Following · tap to stop' })).toBeVisible()
  await expect(phone.getByRole('img', { name: 'Photo of Sir Waddles, coming soon' })).toBeVisible()
  await captureScreen(phone, 'my-animal')

  await phone.getByRole('link', { name: 'Animals', exact: true }).click()
  await expect(phone.getByRole('heading', { name: 'Animals you follow' })).toBeVisible()
  await expect(phone.getByRole('link', { name: /Sir Waddles/ })).toBeVisible()
  await captureScreen(phone, 'animals')
  await host.dispose()
})

test('my animal shows the real photo when one is set', async ({ browser }) => {
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await joinAsPlayer(phone, JOIN_CODES.join, 'Photo Pal')
  const list = await phone.request.get('/api/animals')
  const noodle = (await list.json()).animals.find((a: { name: string | null }) => a.name === 'Noodle')
  const photo = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

  await phone.goto(`/play/${JOIN_CODES.join}/animals/${noodle.id}`)
  await expect(phone.getByRole('heading', { name: 'Noodle' })).toBeVisible()
  await expect(phone.getByRole('img', { name: 'Photo of Noodle, coming soon' })).toBeVisible() // no photo yet: the frame

  // Staff haven't uploaded a photo for any seeded animal, so make the API answer with one.
  await phone.route('**/api/animal?*', async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, json: { ...(await response.json()), image_url: photo } })
  })
  await phone.reload()
  await expect(phone.getByRole('img', { name: 'Photo of Noodle', exact: true })).toHaveAttribute('src', photo)
  await expect(phone.getByRole('img', { name: 'Photo of Noodle, coming soon' })).toHaveCount(0)
  await expectNoAxeViolations(phone)
})

test('staff change an event setting', async ({ browser }) => {
  const staff = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage()
  await signInViaApi(staff, E2E_STAFF_PASSCODE)
  await staff.goto('/staff/settings')
  await staff.getByLabel('Event').selectOption({ label: 'DEMO1 · Deep Sea Night' })
  await staff.getByLabel('Speed bonus').selectOption('tiered')
  await staff.getByRole('button', { name: 'Save settings' }).click()
  await expect(staff.getByText('Saved.')).toBeVisible()
  await staff.reload()
  await staff.getByLabel('Event').selectOption({ label: 'DEMO1 · Deep Sea Night' })
  await expect(staff.getByLabel('Speed bonus')).toHaveValue('tiered')
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
