import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerMessage } from '../../shared/messages'
import { parseSettings } from '../../shared/settings'
import { createRateLimiter } from '../auth/rate-limit'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import type { GameContext } from '../game/context'
import { createTeam, joinTeam, reviewTeamName } from '../game/teams'
import { createTimers } from '../game/timers'
import { createRealtime } from '../realtime/rooms'
import { buildFixture } from './fixtures'
import { bodyOf, call, cookieFrom, makeTestApp, makeTestDb } from './helpers'

let db: Db
let ctx: GameContext
let eventId: string
let mediaDir: string
let eventMessages: ServerMessage[]

const player = (nickname: string) => {
  const id = randomUUID()
  db.insert(t.players).values({ id, nickname }).run()
  return id
}
const memberships = (playerId: string) => db.select().from(t.teamMembers).where(eq(t.teamMembers.playerId, playerId)).all()
const teamRow = (id: string) => db.select().from(t.teams).where(eq(t.teams.id, id)).get()
const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`)
  return result.value
}

beforeEach(() => {
  db = makeTestDb()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-teams-'))
  eventId = seedDemo(db, { mediaDir }).eventId
  ctx = { db, realtime: createRealtime(), timers: createTimers() }
  eventMessages = []
  ctx.realtime.add({ send: (d) => void eventMessages.push(JSON.parse(d)) }, { eventId, playerId: null, teamId: null, isHost: true })
})

afterEach(() => {
  rmSync(mediaDir, { recursive: true, force: true })
  vi.useRealTimers()
})

describe('createTeam', () => {
  it('makes the caller captain of a team whose name awaits approval', () => {
    const ana = player('Ana')
    const team = unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'Deep Divers' }))
    expect(team).toEqual({
      id: team.id,
      name: 'Deep Divers',
      name_status: 'pending',
      captain_id: ana,
      score: 0,
      members: [{ id: ana, nickname: 'Ana' }],
    })
    expect(eventMessages).toContainEqual({ type: 'teams' })
  })

  it('moves the creator into the team room', () => {
    const ana = player('Ana')
    const received: ServerMessage[] = []
    ctx.realtime.add({ send: (d) => void received.push(JSON.parse(d)) }, { eventId, playerId: ana, teamId: null, isHost: false })
    const team = unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'Deep Divers' }))
    ctx.realtime.toTeam(team.id, { type: 'scores' })
    expect(received).toContainEqual({ type: 'scores' })
  })

  it('refuses a profane name', () => {
    expect(createTeam(ctx, { eventId, playerId: player('Ana'), name: 'Fuck Squad' })).toEqual({ ok: false, error: 'name_not_allowed' })
  })

  it('refuses a name already taken in the event, ignoring case', () => {
    createTeam(ctx, { eventId, playerId: player('Ana'), name: 'Team A' })
    expect(createTeam(ctx, { eventId, playerId: player('Ben'), name: 'team a' })).toEqual({ ok: false, error: 'name_taken' })
  })

  it('needs a player', () => {
    expect(createTeam(ctx, { eventId, playerId: null, name: 'Hosts' })).toEqual({ ok: false, error: 'join_first' })
  })

  it('refuses an ended event', () => {
    db.update(t.events).set({ status: 'ended' }).where(eq(t.events.id, eventId)).run()
    expect(createTeam(ctx, { eventId, playerId: player('Ana'), name: 'Late' })).toEqual({ ok: false, error: 'event_ended' })
  })
})

describe('joinTeam', () => {
  it('adds a member, up to max_team_size', () => {
    db.update(t.events).set({ settings: parseSettings({ max_team_size: 2 }) }).where(eq(t.events.id, eventId)).run()
    const team = unwrap(createTeam(ctx, { eventId, playerId: player('Ana'), name: 'Pair' }))
    expect(unwrap(joinTeam(ctx, { teamId: team.id, playerId: player('Ben') })).members.map((m) => m.nickname)).toEqual(['Ana', 'Ben'])
    expect(joinTeam(ctx, { teamId: team.id, playerId: player('Cy') })).toEqual({ ok: false, error: 'team_full' })
  })

  it('answers an unknown team with not_found', () => {
    expect(joinTeam(ctx, { teamId: randomUUID(), playerId: player('Ana') })).toEqual({ ok: false, error: 'not_found' })
  })

  it('moves a player before the start and hands captaincy to the next member', () => {
    const ana = player('Ana')
    const ben = player('Ben')
    const first = unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'First' }))
    joinTeam(ctx, { teamId: first.id, playerId: ben })

    const second = unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'Second' }))

    expect(memberships(ana).map((m) => m.teamId)).toEqual([second.id])
    expect(teamRow(first.id)?.captainId).toBe(ben)
  })

  it('deletes a team its last member leaves before the start', () => {
    const ana = player('Ana')
    const first = unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'Lonely' }))
    const other = unwrap(createTeam(ctx, { eventId, playerId: player('Ben'), name: 'Crowd' }))

    joinTeam(ctx, { teamId: other.id, playerId: ana })

    expect(teamRow(first.id)).toBeUndefined()
    expect(memberships(ana)).toHaveLength(1)
  })

  it('locks players in once the first question opens, but still lets a player with no team join', () => {
    const ana = player('Ana')
    unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'First' }))
    const other = unwrap(createTeam(ctx, { eventId, playerId: player('Ben'), name: 'Other' }))
    db.update(t.events).set({ status: 'live' }).where(eq(t.events.id, eventId)).run()

    expect(joinTeam(ctx, { teamId: other.id, playerId: ana })).toEqual({ ok: false, error: 'already_started' })
    expect(createTeam(ctx, { eventId, playerId: ana, name: 'Escape' })).toEqual({ ok: false, error: 'already_started' })
    expect(joinTeam(ctx, { teamId: other.id, playerId: player('Late Lou') }).ok).toBe(true)
  })

  it('treats joining your own team as a no-op', () => {
    const ana = player('Ana')
    const team = unwrap(createTeam(ctx, { eventId, playerId: ana, name: 'Same' }))
    expect(unwrap(joinTeam(ctx, { teamId: team.id, playerId: ana })).members).toHaveLength(1)
  })
})

describe('reviewTeamName', () => {
  it('approves or rejects a name and tells the event', () => {
    const team = unwrap(createTeam(ctx, { eventId, playerId: player('Ana'), name: 'Kraken Krew' }))
    eventMessages.length = 0

    expect(reviewTeamName(ctx, { teamId: team.id, nameStatus: 'approved' })).toEqual({
      ok: true,
      value: { id: team.id, name: 'Kraken Krew', member_count: 1 },
    })
    expect(eventMessages).toEqual([{ type: 'teams' }])
    expect(unwrap(reviewTeamName(ctx, { teamId: team.id, nameStatus: 'rejected' })).name).toBeNull()
    expect(teamRow(team.id)?.nameStatus).toBe('rejected')
  })
})

describe('join_event additions', () => {
  it('refuses a profane nickname', async () => {
    const { app, db: appDb } = makeTestApp()
    buildFixture(appDb)
    const res = await call(app, 'POST', '/api/join_event', { body: { join_code: 'FIXT1', nickname: 'shithead' } })
    expect(res.status).toBe(400)
    expect(await bodyOf(res)).toEqual({ error: 'nickname_not_allowed' })
  })

  it('limits new-player joins from one IP to 200 a minute, but not rejoins', async () => {
    const { app, db: appDb } = makeTestApp()
    buildFixture(appDb)
    const headers = { 'x-forwarded-for': '203.0.113.50' }
    const joinAs = (nickname: string, token?: string) =>
      call(app, 'POST', '/api/join_event', { token, body: { join_code: 'FIXT1', nickname }, headers })

    const first = await joinAs('Player 0')
    for (let i = 1; i < 200; i++) expect((await joinAs(`Player ${i}`)).status).toBe(200)

    expect((await joinAs('Player 200')).status).toBe(429)
    expect((await joinAs('Player 0 again', cookieFrom(first))).status).toBe(200)
  })
})

describe('createRateLimiter', () => {
  it('limits per key and forgets idle keys after the window', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 })
    expect([limiter.attempt('a').ok, limiter.attempt('a').ok, limiter.attempt('a').ok]).toEqual([true, true, false])
    limiter.attempt('b')
    expect(limiter.size()).toBe(2)

    vi.setSystemTime(Date.now() + 1001)
    for (let i = 0; i < 100; i++) limiter.attempt(`fresh-${i % 2}`)

    expect(limiter.size()).toBe(2)
    expect(limiter.attempt('a').ok).toBe(true)
  })
})
