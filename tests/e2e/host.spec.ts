// Milestone 4 done-when (docs/SPEC.md section 8): a full night hosted from a tablet while the
// display runs in another browser, with a player on a phone.
import { expect, test, type Browser, type Page } from '@playwright/test'
import { E2E_HOST_PASSCODE, JOIN_CODES } from './constants'
import { createTeam, expectNoAxeViolations, joinAsPlayer } from './support'

async function signInAsHost(page: Page, path: string) {
  await page.goto(path)
  await page.getByLabel('Passcode').fill(E2E_HOST_PASSCODE)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

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
  await signInAsHost(console_, '/host')
  await console_.getByRole('link', { name: `Run ${JOIN_CODES.host}` }).click()
  await expect(console_.getByRole('heading', { name: `Host console · ${JOIN_CODES.host}` })).toBeVisible()
  await console_.getByRole('button', { name: 'Approve Console Crew' }).click()
  await expect(console_.getByText('Approved ·')).toBeVisible()
  await expectNoAxeViolations(console_)

  const display = await tablet(browser)
  await signInAsHost(display, console_.url() + '/display')
  await expect(display.getByRole('img', { name: 'QR code to join the game' })).toBeVisible()
  await expect(display.getByText(`Code: ${JOIN_CODES.host}`)).toBeVisible()
  await expectNoAxeViolations(display)

  const primary = (name: string) => console_.getByRole('button', { name, exact: true }).click()

  // Question 1: multiple choice, counted, locked and revealed from the console.
  await primary('Start the game')
  await expect(display.getByRole('heading', { name: "What is the deepest known point in Earth's oceans?" })).toBeVisible()
  await phone.getByRole('button', { name: 'Challenger Deep' }).click()
  await expect(console_.getByText('1 of 1 teams answered')).toBeVisible()
  await primary('Lock answers')
  await primary('Reveal the answer')
  await expect(display.getByRole('heading', { name: 'Answer: Challenger Deep' })).toBeVisible()
  await expect(phone.getByRole('heading', { name: 'Correct' })).toBeVisible()

  // Question 2: a borderline typed answer, accepted from the review queue before the reveal.
  await primary('Next')
  await phone.getByLabel('Your answer').fill('octopuss')
  await phone.getByRole('button', { name: 'Submit answer' }).click()
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
  await expect(display.getByText('Paused')).toBeVisible()
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
