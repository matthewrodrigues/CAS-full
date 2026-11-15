/// <reference lib="dom" />
// Records walkthrough/nightlife-trivia-walkthrough.webm: one game night on a phone, the host
// console (and staff page) and the big screen, side by side with captions, ending on a QR code
// that opens the live demo.
//
// Run it against a local server, never the live one: the recording plays DEMO1 to the end, and
// the live DEMO1 has to stay open for viewers. Start the local server with PUBLIC_URL set to the
// live address so the big screen's QR in the video points there too:
//
//   npm run record-walkthrough -- --url http://localhost:3100 --public https://<app>.fly.dev \
//     --host-passcode <local host passcode> --staff-passcode <local staff passcode>
import { mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium, type BrowserContext, type Locator, type Page } from '@playwright/test'
import QRCode from 'qrcode'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3100' },
    public: { type: 'string' },
    'host-passcode': { type: 'string' },
    'staff-passcode': { type: 'string' },
    code: { type: 'string', default: 'DEMO1' },
    out: { type: 'string', default: 'walkthrough/nightlife-trivia-walkthrough.webm' },
  },
})
const base = values.url!.replace(/\/+$/, '')
const publicUrl = (values.public ?? base).replace(/\/+$/, '')
const code = values.code!
if (!values['host-passcode'] || !values['staff-passcode']) throw new Error('Pass --host-passcode and --staff-passcode for the local server')

const STEPS = 9
const font = (pkg: string, file: string) => readFileSync(resolve('node_modules/@fontsource-variable', pkg, 'files', file)).toString('base64')

const STAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${font('fraunces', 'fraunces-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Figtree; src: url(data:font/woff2;base64,${font('figtree', 'figtree-latin-wght-normal.woff2')}) format('woff2'); font-weight: 300 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; overflow: hidden; background: #f6f2e6; color: #13221b; font-family: Figtree, sans-serif; position: relative; }
.label { position: absolute; padding: 8px 18px; border: 2px solid #0f3b2c; border-radius: 999px; font-size: 22px; font-weight: 600; background: #fff; }
.panel { position: absolute; overflow: hidden; border: 3px solid #0f3b2c; box-shadow: 0 6px 0 #0f3b2c; background: #fff; }
.panel img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
#phone { left: 40px; top: 100px; width: 408px; height: 884px; border-radius: 44px; border-width: 10px; }
#console { left: 500px; top: 100px; width: 640px; height: 480px; border-radius: 16px; }
#screen { left: 1180px; top: 100px; width: 700px; height: 394px; border-radius: 16px; }
#caption { position: absolute; left: 500px; top: 630px; width: 1380px; height: 354px; padding: 40px 48px; border-radius: 20px; background: #fff; border: 3px solid #0f3b2c; box-shadow: 0 6px 0 #0f3b2c; }
#step { font-size: 22px; font-weight: 700; letter-spacing: .12em; color: #4d5a53; }
#title { font-family: Fraunces, serif; font-size: 60px; font-weight: 600; margin: 14px 0 16px; line-height: 1.1; }
#body { font-size: 32px; line-height: 1.4; color: #4d5a53; }
#dots { position: absolute; right: 48px; top: 44px; display: flex; gap: 10px; }
#dots i { width: 16px; height: 16px; border-radius: 99px; border: 2px solid #0f3b2c; }
#dots i.on { background: #0f3b2c; width: 40px; }
.card { position: absolute; inset: 0; background: #0f3b2c; color: #f6f2e6; display: flex; align-items: center; justify-content: center; gap: 96px; padding: 80px; transition: opacity .6s; }
.card h1 { font-family: Fraunces, serif; font-size: 120px; font-weight: 600; line-height: 1; }
.card p { font-size: 40px; line-height: 1.4; margin-top: 28px; color: #b4e6dc; }
.card .url { font-size: 44px; font-weight: 700; color: #ffc53d; margin-top: 20px; }
.card img { width: 460px; height: 460px; background: #fff; padding: 22px; border-radius: 24px; }
.hidden { opacity: 0; pointer-events: none; }
</style></head><body>
<span class="label" style="left:40px;top:36px">Player’s phone</span>
<span class="label" id="console-label" style="left:500px;top:36px">Host console</span>
<span class="label" style="left:1180px;top:36px">Big screen</span>
<div class="panel" id="phone"><img></div>
<div class="panel" id="console"><img></div>
<div class="panel" id="screen"><img></div>
<div id="caption"><div id="dots"></div><p id="step"></p><h2 id="title"></h2><p id="body"></p></div>
<div class="card" id="intro"><div><h1>NightLife<br>Trivia</h1><p>One game night at the California Academy of Sciences:<br>a phone, the host console and the big screen, live.</p></div></div>
<div class="card hidden" id="outro"><div><h1>Try it now</h1><p>Scan the code with your phone camera<br>to join the demo game.</p><p class="url"></p></div><img alt=""></div>
</body></html>`

const browser = await chromium.launch()
const videoDir = resolve('walkthrough/.recording')
rmSync(videoDir, { recursive: true, force: true })
const stageContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } } })
const stage = await stageContext.newPage()
await stage.setContent(STAGE)

const newPage = async (width: number, height: number): Promise<[BrowserContext, Page]> => {
  const context = await browser.newContext({ baseURL: base, viewport: { width, height } })
  return [context, await context.newPage()]
}
const [, phone] = await newPage(390, 844)
const [hostContext, console_] = await newPage(1024, 768)
const [, staff] = await newPage(1024, 768)
const screen = await hostContext.newPage()
await screen.setViewportSize({ width: 1920, height: 1080 }) // a projector

// Each login from its own made-up address: logins are rate-limited per IP.
let bucket = 1
const signIn = async (page: Page, passcode: string) => {
  const res = await page.context().request.post('/api/login', { data: { passcode }, headers: { 'x-forwarded-for': `10.9.0.${bucket++}` } })
  if (!res.ok()) throw new Error(`login failed: ${res.status()}`)
}

let middle: Page = console_
const shot = async (page: Page) => `data:image/jpeg;base64,${(await page.screenshot({ type: 'jpeg', quality: 85 })).toString('base64')}`
async function snap() {
  const [p, c, s] = await Promise.all([shot(phone), shot(middle), shot(screen)])
  // No named helpers inside evaluate: tsx would wrap them in a __name() the browser doesn't have.
  await stage.evaluate((shots) => {
    for (const [id, src] of shots) (document.querySelector(`#${id} img`) as HTMLImageElement).src = src
  }, [['phone', p], ['console', c], ['screen', s]])
}
/** Keeps the panels live (countdowns tick) for `ms`. */
async function hold(ms: number) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    await snap()
    await stage.waitForTimeout(150)
  }
}
async function caption(step: number, title: string, body: string) {
  await stage.evaluate(
    ({ step, steps, title, body }) => {
      document.querySelector('#step')!.textContent = `STEP ${step} OF ${steps}`
      document.querySelector('#title')!.textContent = title
      document.querySelector('#body')!.textContent = body
      document.querySelector('#dots')!.innerHTML = Array.from({ length: steps }, (_, i) => `<i class="${i + 1 === step ? 'on' : ''}"></i>`).join('')
    },
    { step, steps: STEPS, title, body },
  )
}
const showMiddle = async (page: Page, label: string) => {
  middle = page
  await stage.evaluate((label) => (document.querySelector('#console-label')!.textContent = label), label)
}
const visible = (locator: Locator) => locator.waitFor({ state: 'visible', timeout: 30_000 })

// Intro --------------------------------------------------------------------------------------
await signIn(console_, values['host-passcode']!)
await signIn(staff, values['staff-passcode']!)
await console_.goto('/host')
await console_.getByRole('link', { name: `Run ${code}` }).click()
await visible(console_.getByRole('heading', { name: `Host console · ${code}` }))
const eventPath = new URL(console_.url()).pathname
await screen.goto(`${eventPath}/display`)
await visible(screen.getByRole('img', { name: 'QR code to join the game' }))
await phone.goto('/')
await snap()
await stage.waitForTimeout(3500)
await stage.evaluate(() => document.querySelector('#intro')!.classList.add('hidden'))

// 1. Lobby ------------------------------------------------------------------------------------
await caption(1, 'The host opens tonight’s game', 'The big screen shows the code to join and tonight’s prizes: the top three teams each name an Academy animal.')
await hold(5000)

// 2. Join -------------------------------------------------------------------------------------
await caption(2, 'Players scan and join', 'No app and no account. The QR code opens the game in the phone’s browser; players pick a nickname.')
await phone.goto(`/play/${code}`)
await hold(1200)
await phone.getByLabel('Your nickname').pressSequentially('Riley', { delay: 120 })
await hold(600)
await phone.getByRole('button', { name: 'Join the game' }).click()
await visible(phone.getByLabel('Team name'))
await hold(2500)

// 3. Teams ------------------------------------------------------------------------------------
await caption(3, 'Teams form up', 'Players start or join a team. Names are checked automatically, then approved by the host before they reach the big screen.')
await phone.getByLabel('Team name').pressSequentially('Reef Raiders', { delay: 100 })
await phone.getByRole('button', { name: 'Create team' }).click()
await visible(phone.getByRole('heading', { name: 'Reef Raiders' }))
await hold(2000)
await console_.getByRole('button', { name: 'Approve Reef Raiders' }).click()
await hold(3000)

// 4. Live question -----------------------------------------------------------------------------
const primary = (name: string) => console_.getByRole('button', { name, exact: true }).click()
await caption(4, 'A question goes live everywhere', 'The host starts the game. The question and the countdown appear on every phone and on the big screen at once.')
await primary('Start the game')
await visible(phone.getByRole('button', { name: 'Challenger Deep' }))
await hold(4000)

// 5. Answer -----------------------------------------------------------------------------------
await caption(5, 'Teams answer before time runs out', 'Any teammate can answer. The host sees how many teams are in, then locks answers.')
await phone.getByRole('button', { name: 'Challenger Deep' }).click()
await visible(console_.getByText('1 of 1 teams answered'))
await hold(2500)
await primary('Lock answers')
await hold(2000)

// 6. Reveal -----------------------------------------------------------------------------------
await caption(6, 'The answer, and a fun fact', 'Scoring happens on the server. Every phone shows its own result, and the big screen shares a fact from the Academy.')
await primary('Reveal the answer')
await visible(phone.getByRole('heading', { name: 'Correct' }))
await hold(5000)

// 7. Final scores ------------------------------------------------------------------------------
await caption(7, 'Four rounds later: final scores', 'Picture and sound rounds, and a final wager. (Skipped ahead here.)')
const over = console_.getByText('The game is over.')
const advance = console_.getByRole('button', { name: /^(Skip question|Next|Start the next round|Open the final question|End the game)$/ }).first()
for (let i = 0; i < 200 && !(await over.isVisible()); i++) {
  await advance.click({ timeout: 5000 }).catch(() => {})
  if (i % 4 === 0) await snap()
}
await visible(phone.getByText('Your team won the right to name the African penguin chick!'))
await hold(5000)

// 8. Naming -----------------------------------------------------------------------------------
await caption(8, 'The winners name an Academy animal', 'First place names the penguin chick. Academy staff check the name before it becomes official.')
await phone.getByRole('link', { name: 'Pick a name' }).click()
await visible(phone.getByLabel("Your team's name for it"))
await hold(1000)
await phone.getByLabel("Your team's name for it").pressSequentially('Sir Waddles', { delay: 110 })
await phone.getByRole('button', { name: 'Suggest this name' }).click()
await visible(phone.getByText('“Sir Waddles” is with Academy staff for approval.'))
await staff.goto('/staff/animals')
await showMiddle(staff, 'Staff page')
await visible(staff.getByRole('button', { name: 'Approve the name Sir Waddles' }))
await hold(3000)
await staff.getByRole('button', { name: 'Approve the name Sir Waddles' }).click()
await phone.reload()
await visible(phone.getByText('Approved! The animal is now called Sir Waddles.'))
await hold(3500)

// 9. Tracking ---------------------------------------------------------------------------------
await caption(9, 'Follow your animal', 'Everyone who played follows the night’s animals. Keepers post updates, and players see them in the Animals tab.')
const row = staff.getByRole('listitem').filter({ has: staff.getByLabel('New update about Sir Waddles · African penguin chick') })
await row.scrollIntoViewIfNeeded()
await row.getByRole('textbox').pressSequentially('Sir Waddles took a first swim today!', { delay: 60 })
await row.getByRole('button', { name: 'Post update' }).click()
await visible(row.getByText('Posted.'))
await phone.getByRole('link', { name: 'Follow its updates' }).click()
await visible(phone.getByText('Sir Waddles took a first swim today!'))
await hold(5000)

// Outro: the live demo ------------------------------------------------------------------------------
const joinUrl = `${publicUrl}/play/${code}`
const qr = await QRCode.toDataURL(joinUrl, { margin: 1, width: 460 })
await stage.evaluate(
  ({ qr, label }) => {
    const outro = document.querySelector('#outro')!
    ;(outro.querySelector('img') as HTMLImageElement).src = qr
    outro.querySelector('.url')!.textContent = label
    outro.classList.remove('hidden')
  },
  { qr, label: joinUrl.replace(/^https?:\/\//, '') },
)
await stage.waitForTimeout(8000)

const video = stage.video()!
await stageContext.close()
const out = resolve(values.out!)
mkdirSync(dirname(out), { recursive: true })
rmSync(out, { force: true })
renameSync(await video.path(), out)
rmSync(videoDir, { recursive: true, force: true })
await browser.close()
console.log(`Saved ${out} (QR: ${joinUrl})`)
