// Joining (docs/SPEC.md section 3, /play/:joinCode): nickname, create or join a team, lobby.
import { expect, test } from '@playwright/test'
import { JOIN_CODES } from './constants'
import { botPlayer, captureScreen, createTeam, expectNoAxeViolations, expectNoHorizontalScroll, hostApi, joinAsPlayer, joinTeam } from './support'

const code = JOIN_CODES.join

test.describe.configure({ mode: 'serial' }) // the tests share E2EA1 and run in order

test('a player joins with a nickname and creates a team', async ({ page }) => {
  await page.goto(`/play/${code}`)
  await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible()
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)

  await joinAsPlayer(page, code, 'Ana')
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toBeVisible()
  await expect(page.getByText('Hi, Ana! Start a team or hop on one.')).toBeVisible()
  await expectNoAxeViolations(page)

  await createTeam(page, 'Reef Raiders')
  await expect(page.getByRole('status').filter({ hasText: 'Waiting for the host' })).toBeVisible()
  await expect(page.getByText('1 player', { exact: true })).toBeVisible()
  await expect(page.getByText('Ana', { exact: true })).toBeVisible()
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)
})

test('tab bar hidden on join, shown in the lobby', async ({ page }) => {
  const tabs = page.getByRole('navigation', { name: 'Game sections' })
  await page.goto(`/play/${code}`)
  await expect(page.getByLabel('Your nickname')).toBeVisible()
  await expect(tabs).toHaveCount(0)

  await joinAsPlayer(page, code, 'Tab Tester')
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toBeVisible()
  await expect(tabs).toHaveCount(0)

  await createTeam(page, 'Tab Testers')
  await expect(tabs).toBeVisible()
  await expect(tabs.getByRole('link', { name: 'Play' })).toHaveAttribute('aria-current', 'page')

  // Switching team is the team step again: no tab bar, and a way back.
  await page.getByRole('button', { name: 'Switch team' }).click()
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toBeVisible()
  await expect(tabs).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to my team' }).click()
  await expect(page.getByRole('heading', { name: 'Tab Testers' })).toBeVisible()
  await expect(tabs).toBeVisible()
})

test('a second player joins that team from the list, and both lobbies update', async ({ browser }) => {
  const first = await browser.newPage()
  await joinAsPlayer(first, code, 'Cy')
  await createTeam(first, 'Kelp Crew')

  const second = await browser.newPage()
  await joinAsPlayer(second, code, 'Dee')
  await expect(second.getByRole('button', { name: 'Count me in!' })).toBeDisabled()
  await second.getByRole('button', { name: /^Kelp Crew / }).click()
  await expect(second.getByText("You're joining Kelp Crew.")).toBeVisible()
  await second.getByRole('button', { name: 'Count me in!' }).click()
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
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByRole('alert')).toHaveText("We can't find that game. Check the code on the big screen.")
})

test('a nickname the filter rejects asks for another', async ({ page }) => {
  await page.goto(`/play/${code}`)
  const nickname = page.getByLabel('Your nickname')
  await nickname.fill('shithead')
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByRole('alert')).toHaveText('Please pick a different nickname.')
  await expect(nickname).toHaveAttribute('aria-invalid', 'true')
  await nickname.fill('Sam')
  await expect(page.getByRole('alert')).toHaveText('')
})

test('a player who joins after the first question opens gets the team screen', async ({ page, baseURL }) => {
  const eventId = await joinAsPlayer(page, code, 'Late Lou')
  const host = await hostApi(baseURL!)
  await host.act('host_next', eventId)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toBeVisible()
  await expect(page.getByText('The game has started. You can still join a team.')).toBeVisible()
  await page.getByLabel('Team name').fill('Latecomers')
  await page.getByRole('button', { name: 'Start our team!' }).click()
  await expect(page.getByRole('heading', { name: 'Pick your team' })).toHaveCount(0)
  await host.dispose()
})

// Screen captures for the design review: each named after its design/screens/<name>.html reference.
test.describe('screens', () => {
  test('landing, join-nickname, join-team and lobby', async ({ page, baseURL }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'NightLife Trivia' })).toBeVisible()
    await captureScreen(page, 'landing')

    await page.goto(`/play/${JOIN_CODES.screens}`)
    await expect(page.getByLabel('Your nickname')).toBeVisible()
    await captureScreen(page, 'join-nickname')

    // The mockup's teams: two open, one full.
    const others = [
      { captain: 'Priya', team: 'The Anglerfish Five', more: ['Ola', 'Raj', 'Uma'] },
      { captain: 'Jess', team: 'The Blobfish Brigade', more: ['Marco'] },
      { captain: 'Vic', team: 'Squid Pro Quo', more: ['Wes', 'Xan', 'Yui', 'Zed', 'Abe'] },
    ]
    const bots = []
    for (const { captain, team, more } of others) {
      const lead = await botPlayer(baseURL!, JOIN_CODES.screens, captain)
      const teamId = await lead.createTeam(team)
      bots.push(lead)
      for (const nickname of more) {
        const mate = await botPlayer(baseURL!, JOIN_CODES.screens, nickname)
        await mate.joinTeam(teamId)
        bots.push(mate)
      }
    }

    await joinAsPlayer(page, JOIN_CODES.screens, 'Sam')
    await expect(page.getByRole('button', { name: 'Squid Pro Quo 6 of 6 players · this team is full' })).toBeDisabled()
    await captureScreen(page, 'join-team')
    await expectNoHorizontalScroll(page)

    await joinTeam(page, 'The Blobfish Brigade')
    await expect(page.getByRole('heading', { name: 'The Blobfish Brigade' })).toBeVisible()
    await expect(page.getByText('3 players', { exact: true })).toBeVisible()
    await expect(page.getByText('You', { exact: true })).toBeVisible()
    await expect(page.getByText("Tonight's prizes")).toBeVisible()
    await captureScreen(page, 'lobby')
    await expectNoHorizontalScroll(page)
    for (const bot of bots) await bot.dispose()
  })

  test('join-team-stress: long names and 14 teams', async ({ page, baseURL }) => {
    const teams = [
      ['AnglerfishAnglerfishAnglerfish', 5],
      ['Twenty Thousand Leagues Deeper', 3],
      ['The Anglerfish Five', 4],
      ['Squid Pro Quo Quiz Squad Too', 6],
      ['Kraken Up', 2],
      ['Les Mollusques Magnifique', 1],
      ['Pressure Drop at the Bottom', 5],
      ['Glow in the Dark Matter', 6],
      ['Hagfish Happy Hour', 3],
      ['Siphonophore Sophomores', 2],
      ['Vampire Squid Vibes', 4],
      ['The Blobfish Appreciators', 1],
      ['Isopod Squad', 6],
      ['Comb Jelly Comedians', 2],
    ] as const
    const bots = []
    let n = 0
    for (const [team, size] of teams) {
      const lead = await botPlayer(baseURL!, JOIN_CODES.screensStressTeams, `Captain ${++n}`)
      const teamId = await lead.createTeam(team)
      bots.push(lead)
      for (let i = 1; i < size; i++) {
        const mate = await botPlayer(baseURL!, JOIN_CODES.screensStressTeams, `Mate ${n}-${i}`)
        await mate.joinTeam(teamId)
        bots.push(mate)
      }
    }

    await joinAsPlayer(page, JOIN_CODES.screensStressTeams, 'Wilhelmina Starfish-Boyd')
    await page.getByLabel('Team name').fill('The Bioluminescent Brainiacs!!')
    await page.getByLabel('Team name').blur() // the mockup shows the field unfocused
    await expect(page.getByRole('button', { name: 'Start our team!' })).toBeEnabled()
    await expect(page.getByText("You'll be the captain.")).toBeVisible()
    await captureScreen(page, 'join-team-stress')
    await expectNoHorizontalScroll(page)
    for (const bot of bots) await bot.dispose()
  })

  test('lobby-stress: a long team name and 8 long nicknames', async ({ page, baseURL }) => {
    const code = JOIN_CODES.screensStressLobby
    const team = 'The Bioluminescent Brainiacs!!'
    const captain = await botPlayer(baseURL!, code, 'Wilhelmina Starfish-Boyd')
    const teamId = await captain.createTeam(team)
    const bots = [captain]
    for (const nickname of ['Bartholomew Octavius III', 'Sir Reginald Pufferfish!']) {
      const mate = await botPlayer(baseURL!, code, nickname)
      await mate.joinTeam(teamId)
      bots.push(mate)
    }

    await joinAsPlayer(page, code, 'Gwendolyn Abernathy-Moss')
    await joinTeam(page, team)

    for (const nickname of ['BarnacleBarnacleBarnacle', 'Philippa Barnacle-Hughes', 'Theodora Wigglesworth-Ng', 'Guinevere Lighthouse-Day']) {
      const mate = await botPlayer(baseURL!, code, nickname)
      await mate.joinTeam(teamId)
      bots.push(mate)
    }
    await expect(page.getByText('8 players', { exact: true })).toBeVisible()
    await expect(page.getByText("Tonight's prizes")).toBeVisible()
    await captureScreen(page, 'lobby-stress')
    await expectNoHorizontalScroll(page)
    for (const bot of bots) await bot.dispose()
  })
})
