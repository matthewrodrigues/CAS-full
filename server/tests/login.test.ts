import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as t from '../db/schema'
import { call, cookieFrom, makeTestApp, sessionFor, TEST_HOST_PASSCODE, TEST_STAFF_PASSCODE } from './helpers'

afterEach(() => {
  vi.useRealTimers()
})

type App = ReturnType<typeof makeTestApp>['app']

const login = (app: App, passcode: unknown, opts: { token?: string; ip?: string } = {}) =>
  call(app, 'POST', '/api/login', {
    token: opts.token,
    body: { passcode },
    headers: { 'x-forwarded-for': opts.ip ?? '198.51.100.7' },
  })

const me = async (app: App, token?: string) => (await call(app, 'GET', '/api/me', { token })).json()

describe('login', () => {
  it('gives the host passcode the host role', async () => {
    const { app } = makeTestApp()
    const res = await login(app, TEST_HOST_PASSCODE)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ role: 'host' })
    expect(await me(app, cookieFrom(res))).toMatchObject({ role: 'host' })
  })

  it('gives the staff passcode the staff role', async () => {
    const { app } = makeTestApp()
    const res = await login(app, TEST_STAFF_PASSCODE)
    expect(await me(app, cookieFrom(res))).toMatchObject({ role: 'staff' })
  })

  it('rotates the session token and keeps the player', async () => {
    const { app, db } = makeTestApp()
    const playerId = randomUUID()
    db.insert(t.players).values({ id: playerId, nickname: 'Quiz Whiz' }).run()
    const oldToken = sessionFor(db, 'player', playerId)

    const res = await login(app, TEST_HOST_PASSCODE, { token: oldToken })
    const newToken = cookieFrom(res)

    expect(newToken).toBeDefined()
    expect(newToken).not.toBe(oldToken)
    expect(await me(app, oldToken)).toEqual({ role: null, player: null })
    expect(await me(app, newToken)).toEqual({ role: 'host', player: { id: playerId, nickname: 'Quiz Whiz' } })
  })

  it('rejects a wrong passcode', async () => {
    const { app } = makeTestApp()
    const res = await login(app, 'not-the-passcode')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'wrong_passcode' })
    expect(cookieFrom(res)).toBeUndefined()
  })

  it('never matches an unset passcode', async () => {
    const { app } = makeTestApp({ hostPasscode: undefined })
    expect((await login(app, '')).status).toBe(400)
    expect((await login(app, 'anything')).status).toBe(401)
  })

  it('rejects a body without a passcode string', async () => {
    const { app } = makeTestApp()
    const res = await login(app, 12345)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_input' })
  })
})

describe('login rate limit', () => {
  it('answers the sixth attempt in a minute from one IP with 429 and Retry-After', async () => {
    const { app } = makeTestApp()
    for (let i = 0; i < 5; i++) expect((await login(app, 'wrong', { ip: '203.0.113.9' })).status).toBe(401)

    const res = await login(app, TEST_HOST_PASSCODE, { ip: '203.0.113.9' })
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('keys on the address the proxy appended, not one the client wrote', async () => {
    const { app } = makeTestApp()
    for (let i = 0; i < 5; i++) await login(app, 'wrong', { ip: `10.0.0.${i}, 203.0.113.9` })
    expect((await login(app, 'wrong', { ip: '10.9.9.9, 203.0.113.9' })).status).toBe(429)
  })

  it('does not limit a different client', async () => {
    const { app } = makeTestApp()
    for (let i = 0; i < 5; i++) await login(app, 'wrong', { ip: '203.0.113.9' })
    expect((await login(app, 'wrong', { ip: '203.0.113.10' })).status).toBe(401)
  })

  it('resets after 60 seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { app } = makeTestApp()
    for (let i = 0; i < 5; i++) await login(app, 'wrong', { ip: '203.0.113.9' })
    vi.setSystemTime(Date.now() + 60_001)
    expect((await login(app, 'wrong', { ip: '203.0.113.9' })).status).toBe(401)
  })
})

describe('GET /api/me', () => {
  it('reports no role without a session', async () => {
    const { app } = makeTestApp()
    expect(await me(app)).toEqual({ role: null, player: null })
  })
})
