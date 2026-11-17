// The demo quickstart: restart DEMO1 to a fresh lobby, and the autopilot switch. DEMO1 only, host only.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { and, count, eq, inArray, isNotNull } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import { bodyOf, call, cookieFrom, makeTestApp, sessionFor } from './helpers'

let test: ReturnType<typeof makeTestApp>
let demoId: string
let otherId: string
let mediaDir: string
let host: string

beforeEach(() => {
  test = makeTestApp()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-demo-'))
  demoId = seedDemo(test.db, { mediaDir }).eventId
  otherId = seedDemo(test.db, { mediaDir, joinCode: 'OTHR1' }).eventId
  host = sessionFor(test.db, 'host')
})
afterEach(() => {
  test.game.stop()
  vi.useRealTimers()
  rmSync(mediaDir, { recursive: true, force: true })
})

const post = (path: string, token: string | undefined, body: unknown) => call(test.app, 'POST', path, { token, body })
const get = (path: string, token: string) => call(test.app, 'GET', path, { token })
const phaseOf = async (eventId: string) => (await bodyOf(await get(`/api/get_state?event_id=${eventId}`, host))).state.phase
const teamsIn = (eventId: string) => test.db.select({ n: count() }).from(t.teams).where(eq(t.teams.eventId, eventId)).get()!.n

async function teamIn(joinCode: string, eventId: string, name: string) {
  const token = cookieFrom(await call(test.app, 'POST', '/api/join_event', { body: { join_code: joinCode, nickname: `${name} cap` } }))!
  const teamId = (await bodyOf(await post('/api/create_team', token, { event_id: eventId, name }))).id as string
  return { token, teamId }
}

async function playToEnd(eventId: string) {
  for (let i = 0; i < 200; i++) {
    const phase = await phaseOf(eventId)
    if (phase === 'ended') return
    const op = ['live', 'locked', 'final_live', 'final_locked'].includes(phase) ? 'host_skip' : 'host_next'
    expect((await post(`/api/${op}`, host, { event_id: eventId })).status).toBe(200)
  }
  throw new Error('never ended')
}

/** Plays DEMO1 to the end with one team on 20 points, which names the place-1 animal. */
async function playedDemo() {
  const team = await teamIn('DEMO1', demoId, 'Anglers')
  await post('/api/host_adjust_score', host, { team_id: team.teamId, points: 20, note: 'Setup' })
  await playToEnd(demoId)
  const [right] = (await bodyOf(await get('/api/my_naming_rights', team.token))).rights
  await post('/api/propose_animal_name', team.token, { right_id: right.id, name: 'Waddles' })
  await post('/api/staff_review_animal_name', sessionFor(test.db, 'staff'), { right_id: right.id, status: 'approved' })
  return team
}

describe('restart demo', () => {
  it('returns an ended demo to a fresh lobby', async () => {
    await playedDemo()
    expect(test.db.select().from(t.animals).where(eq(t.animals.name, 'Waddles')).get()).toBeTruthy()

    const res = await post('/api/host_demo_restart', host, { event_id: demoId })
    expect(res.status).toBe(200)
    expect((await bodyOf(res)).phase).toBe('lobby')

    expect(await phaseOf(demoId)).toBe('lobby')
    expect(test.db.select().from(t.events).where(eq(t.events.id, demoId)).get()!.status).toBe('ready')
    expect(teamsIn(demoId)).toBe(0)
    const prizeIds = test.db.select({ id: t.namingPrizes.id }).from(t.namingPrizes).where(eq(t.namingPrizes.eventId, demoId)).all().map((p) => p.id)
    expect(test.db.select({ n: count() }).from(t.namingRights).where(inArray(t.namingRights.prizeId, prizeIds)).get()!.n).toBe(0)
    expect(test.db.select().from(t.animals).where(eq(t.animals.name, 'Waddles')).get()).toBeUndefined()
    expect(test.db.select({ n: count() }).from(t.animals).where(eq(t.animals.namedEventId, demoId)).get()!.n).toBe(0)
    const rounds = test.db.select({ host: t.rounds.host }).from(t.rounds).where(eq(t.rounds.eventId, demoId)).all()
    expect(rounds.every((r) => r.host === null)).toBe(true)
    const flagged = test.db
      .select({ n: count() })
      .from(t.eventQuestions)
      .where(and(eq(t.eventQuestions.eventId, demoId), isNotNull(t.eventQuestions.skippedAt)))
      .get()!.n
    expect(flagged).toBe(0)
  })

  it('leaves other events and their named animals alone', async () => {
    const other = await teamIn('OTHR1', otherId, 'Others')
    await post('/api/host_next', host, { event_id: otherId })
    const noodleBefore = test.db.select().from(t.animals).where(eq(t.animals.name, 'Noodle')).get()
    await playedDemo()

    await post('/api/host_demo_restart', host, { event_id: demoId })

    expect(teamsIn(otherId)).toBe(1)
    expect(test.db.select().from(t.teams).where(eq(t.teams.id, other.teamId)).get()).toBeTruthy()
    expect(await phaseOf(otherId)).toBe('live')
    expect(test.db.select().from(t.animals).where(eq(t.animals.name, 'Noodle')).get()).toEqual(noodleBefore)
  })

  it('disarms the auto-lock of a question that was open', async () => {
    vi.useFakeTimers()
    await teamIn('DEMO1', demoId, 'Anglers')
    await post('/api/host_next', host, { event_id: demoId })
    expect(await phaseOf(demoId)).toBe('live')
    await post('/api/host_demo_restart', host, { event_id: demoId })
    vi.advanceTimersByTime(120_000)
    expect(await phaseOf(demoId)).toBe('lobby')
  })

  it('cancels a pending autopilot step', async () => {
    vi.useFakeTimers()
    await teamIn('DEMO1', demoId, 'Anglers')
    await post('/api/host_next', host, { event_id: demoId })
    await post('/api/host_lock', host, { event_id: demoId })
    await post('/api/host_demo_autopilot', host, { event_id: demoId, on: true })
    await post('/api/host_demo_restart', host, { event_id: demoId })
    vi.advanceTimersByTime(10_000)
    expect(await phaseOf(demoId)).toBe('lobby')
  })
})

describe('demo is DEMO1 only, and host only', () => {
  it('refuses another event', async () => {
    expect(await bodyOf(await post('/api/host_demo_restart', host, { event_id: otherId }))).toEqual({ error: 'not_demo' })
    const res = await post('/api/host_demo_autopilot', host, { event_id: otherId, on: true })
    expect(res.status).toBe(403)
    expect(await bodyOf(res)).toEqual({ error: 'not_demo' })
  })

  it('checks the session, the role and the input', async () => {
    const player = await teamIn('DEMO1', demoId, 'Anglers')
    expect((await post('/api/host_demo_restart', undefined, { event_id: demoId })).status).toBe(401)
    expect((await post('/api/host_demo_restart', player.token, { event_id: demoId })).status).toBe(403)
    expect((await post('/api/host_demo_restart', host, { event_id: 'not-a-uuid' })).status).toBe(400)
    expect((await post('/api/host_demo_autopilot', host, { event_id: demoId, on: 'yes' })).status).toBe(400)
    expect((await post('/api/host_demo_autopilot', host, { event_id: demoId, on: true })).status).toBe(200)
    expect((await bodyOf(await get(`/api/get_state?event_id=${demoId}`, host))).host.autopilot).toBe(true)
  })
})
