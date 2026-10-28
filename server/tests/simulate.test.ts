// Milestone 5 done-when, scaled for a unit run: simulated teams over a real server lose nothing.
import { mkdtempSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ServerType } from '@hono/node-server'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { simulate } from '../../scripts/simulate-players'
import { seedDemo } from '../db/seed-demo'
import { startServer } from '../serve'
import { makeTestApp, TEST_HOST_PASSCODE } from './helpers'

let server: ServerType
let test: ReturnType<typeof makeTestApp>
let mediaDir: string
let port: number

beforeEach(async () => {
  test = makeTestApp()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-sim-'))
  seedDemo(test.db, { mediaDir })
  server = await new Promise<ServerType>((resolve) => {
    const s = startServer(test.app.fetch, 0, () => resolve(s))
  })
  port = (server.address() as AddressInfo).port
})

afterEach(async () => {
  test.game.stop()
  ;(server as import('node:http').Server).closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  rmSync(mediaDir, { recursive: true, force: true })
})

it('runs 12 teams through 4 questions with drops and reconnects, and loses no answer', { timeout: 60_000 }, async () => {
  const report = await simulate({
    baseUrl: `http://127.0.0.1:${port}`,
    joinCode: 'DEMO1',
    teams: 12,
    questions: 4,
    hostPasscode: TEST_HOST_PASSCODE,
    maxDelayMs: 300,
    typoRate: 0.3,
    dropRate: 0.3,
  })
  expect(report).toMatchObject({ teams: 12, questions: 4, lost: 0, rejected: {} })
  expect(report.submits).toBeGreaterThanOrEqual(12 * 4)
  expect(report.hostMs.p95).toBeLessThan(500)
})
