import { expect, test } from '@playwright/test'
import { JOIN_CODES } from './constants'

test('app shell, API and WebSocket work together through the dev proxy', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'NightLife Trivia' })).toBeVisible()

  // The API is a separate process behind Vite's proxy; give it a moment to come up.
  await expect
    .poll(async () => (await page.request.get('/api/health')).status(), { timeout: 15_000 })
    .toBe(200)

  // page.request shares the browser's cookies, so the socket below carries this guest session.
  const join = await page.request.post('/api/join_event', { data: { join_code: JOIN_CODES.smoke, nickname: 'Smoke Test' } })
  expect(join.ok()).toBe(true)
  const { event } = await join.json()

  const first = await page.evaluate(
    (eventId) =>
      new Promise<string>((resolve, reject) => {
        const socket = new WebSocket(`ws://${location.host}/ws?event_id=${eventId}`)
        socket.onmessage = (message) => {
          resolve(String(message.data))
          socket.close()
        }
        socket.onerror = () => reject(new Error('WebSocket connection failed'))
      }),
    event.id,
  )
  expect(JSON.parse(first)).toMatchObject({ type: 'state', state: { phase: 'lobby' } })
})
