import { expect, test } from '@playwright/test'

test('app shell, API and WebSocket work together through the dev proxy', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'NightLife Trivia' })).toBeVisible()

  // The API is a separate process behind Vite's proxy; give it a moment to come up.
  await expect
    .poll(async () => (await request.get('/api/health')).status(), { timeout: 15_000 })
    .toBe(200)

  const echoed = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const socket = new WebSocket(`ws://${location.host}/ws`)
        socket.onopen = () => socket.send('ping')
        socket.onmessage = (event) => {
          resolve(String(event.data))
          socket.close()
        }
        socket.onerror = () => reject(new Error('WebSocket connection failed'))
      }),
  )
  expect(echoed).toBe('ping')
})
