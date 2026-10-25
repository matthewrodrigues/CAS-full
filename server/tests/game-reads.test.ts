import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GUEST_SESSION_MS } from '../auth/sessions'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { buildFixture, type Fixture } from './fixtures'
import { bodyOf, call, cookieFrom, makeTestApp } from './helpers'

type App = ReturnType<typeof makeTestApp>['app']

let app: App
let db: Db
let f: Fixture

beforeEach(() => {
  ;({ app, db } = makeTestApp())
  f = buildFixture(db)
})

afterEach(() => {
  vi.useRealTimers()
})

const join = (body: unknown, token?: string) => call(app, 'POST', '/api/join_event', { token, body })
const me = async (token?: string) => (await call(app, 'GET', '/api/me', { token })).json()
const playerCount = () => db.select().from(t.players).all().length

describe('join_event', () => {
  it('creates a guest session and a player', async () => {
    const before = playerCount()
    const res = await join({ join_code: 'FIXT1', nickname: 'Ana' })
    const body = await bodyOf(res)

    expect(res.status).toBe(200)
    expect(body.event).toMatchObject({ id: f.eventId, join_code: 'FIXT1', status: 'live', theme: { slug: 'fixture-theme' } })
    expect(body.state.phase).toBe('live')
    expect(playerCount()).toBe(before + 1)
    expect(await me(cookieFrom(res))).toEqual({ role: 'player', player: { id: body.player.id, nickname: 'Ana' } })
  })

  it('accepts a join code typed in lowercase with spaces', async () => {
    expect((await join({ join_code: ' fixt1 ', nickname: 'Ana' })).status).toBe(200)
  })

  it('updates the nickname on rejoin without creating a player', async () => {
    const first = await join({ join_code: 'FIXT1', nickname: 'Ana' })
    const token = cookieFrom(first)!
    const count = playerCount()

    const again = await join({ join_code: 'FIXT1', nickname: 'Ana B.' }, token)

    expect(again.status).toBe(200)
    expect(cookieFrom(again)).toBeUndefined()
    expect(playerCount()).toBe(count)
    expect(await me(token)).toMatchObject({ player: { nickname: 'Ana B.' } })
  })

  it('issues a new guest session when the cookie has expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const oldToken = cookieFrom(await join({ join_code: 'FIXT1', nickname: 'Ana' }))!
    vi.setSystemTime(Date.now() + GUEST_SESSION_MS + 1000)

    const res = await join({ join_code: 'FIXT1', nickname: 'Ana' }, oldToken)

    expect(res.status).toBe(200)
    expect(cookieFrom(res)).toBeDefined()
    expect(cookieFrom(res)).not.toBe(oldToken)
  })

  it('hides draft events', async () => {
    db.update(t.events).set({ status: 'draft' }).where(eq(t.events.id, f.eventId)).run()
    const res = await join({ join_code: 'FIXT1', nickname: 'Ana' })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('refuses ended events', async () => {
    db.update(t.events).set({ status: 'ended' }).where(eq(t.events.id, f.eventId)).run()
    const res = await join({ join_code: 'FIXT1', nickname: 'Ana' })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'event_ended' })
  })

  it('answers an unknown join code with 404 and creates no session', async () => {
    const res = await join({ join_code: 'ZZZZ9', nickname: 'Ana' })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
    expect(cookieFrom(res)).toBeUndefined()
  })

  it.each([
    { join_code: 'AB', nickname: 'Ana' },
    { join_code: 'FIX$1', nickname: 'Ana' },
    { join_code: 'FIXT1', nickname: '   ' },
    { join_code: 'FIXT1', nickname: 'x'.repeat(25) },
  ])('rejects bad input %o with 400', async (body) => {
    expect((await join(body)).status).toBe(400)
  })
})

describe('get_state', () => {
  it('answers an unknown event with 404', async () => {
    const token = cookieFrom(await join({ join_code: 'FIXT1', nickname: 'Ana' }))
    const res = await call(app, 'GET', `/api/get_state?event_id=${randomUUID()}`, { token })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('rejects a malformed event id with 400', async () => {
    const token = cookieFrom(await join({ join_code: 'FIXT1', nickname: 'Ana' }))
    expect((await call(app, 'GET', '/api/get_state?event_id=not-a-uuid', { token })).status).toBe(400)
  })
})

describe('server_time', () => {
  it('returns the server clock in ms', async () => {
    const { now } = await bodyOf(await call(app, 'GET', '/api/server_time'))
    expect(Math.abs(now - Date.now())).toBeLessThan(1000)
  })
})

describe('login rate limit and players', () => {
  it("doesn't throttle players on the same IP after failed logins", async () => {
    const ip = { 'x-forwarded-for': '203.0.113.9' }
    for (let i = 0; i < 5; i++) await call(app, 'POST', '/api/login', { body: { passcode: 'wrong' }, headers: ip })
    expect((await call(app, 'POST', '/api/login', { body: { passcode: 'wrong' }, headers: ip })).status).toBe(429)

    for (let i = 0; i < 10; i++) expect((await call(app, 'GET', '/api/server_time', { headers: ip })).status).toBe(200)
    const joined = await call(app, 'POST', '/api/join_event', { body: { join_code: 'FIXT1', nickname: 'Ana' }, headers: ip })
    expect(joined.status).toBe(200)
  })
})
