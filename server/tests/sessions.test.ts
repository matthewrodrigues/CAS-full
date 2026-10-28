import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requireRole } from '../auth/guards'
import { createSession, deleteExpiredSessions, ensureGuestSession, GUEST_SESSION_MS, loadSession, ROLE_SESSION_MS } from '../auth/sessions'
import type { AppEnv } from '../context'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { EnvSchema } from '../env'
import { call, cookieFrom, makeTestApp, makeTestDb, sessionFor, testConfig } from './helpers'

let db: Db

beforeEach(() => {
  db = makeTestDb()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Test-only routes that exercise the session and guard middleware directly. */
function guardApp(secureCookies = false) {
  const deps = { db, config: testConfig({ secureCookies }) }
  const ok = (c: { text: (s: string) => Response }) => c.text('ok')
  return new Hono<AppEnv>()
    .use('*', loadSession(db))
    .get('/guest', (c) => {
      ensureGuestSession(c, deps)
      return c.text('ok')
    })
    .get('/player', requireRole('player'), ok)
    .get('/host', requireRole('host'), ok)
    .get('/staff', requireRole('staff'), ok)
}

describe('session tokens', () => {
  it('are 32 random bytes stored only as a SHA-256 hash', () => {
    const { token, session } = createSession(db, { role: 'player', playerId: null })
    const other = createSession(db, { role: 'player', playerId: null })

    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    expect(other.token).not.toBe(token)
    const row = db.select().from(t.sessions).where(eq(t.sessions.id, session.id)).get()!
    expect(row.id).toBe(createHash('sha256').update(token).digest('hex'))
    expect(Object.values(row)).not.toContain(token)
  })

  it('give guests 180 days and role sessions 12 hours', () => {
    const now = Date.now()
    expect(createSession(db, { role: 'player', playerId: null }).session.expiresAt - now).toBeGreaterThanOrEqual(
      180 * 86_400_000,
    )
    const role = createSession(db, { role: 'host', playerId: null }).session.expiresAt - now
    expect(role).toBeGreaterThanOrEqual(12 * 3_600_000)
    expect(role).toBeLessThan(13 * 3_600_000)
  })
})

describe('session cookie', () => {
  it('is HttpOnly, SameSite=Lax, Path=/ and not Secure in development', async () => {
    const res = await call(guardApp(), 'GET', '/guest')
    const header = res.headers.getSetCookie().find((c) => c.startsWith('nl_session='))!

    expect(header).toMatch(/; HttpOnly/)
    expect(header).toMatch(/; SameSite=Lax/)
    expect(header).toMatch(/; Path=\//)
    expect(header).not.toMatch(/; Secure/)
    const token = cookieFrom(res)!
    expect(db.select().from(t.sessions).where(eq(t.sessions.id, createHash('sha256').update(token).digest('hex'))).get()).toBeDefined()
  })

  it('is Secure when secureCookies is on', async () => {
    const res = await call(guardApp(true), 'GET', '/guest')
    expect(res.headers.getSetCookie().find((c) => c.startsWith('nl_session='))).toMatch(/; Secure/)
  })

  it('is not reissued when the request already has a valid session', async () => {
    const token = sessionFor(db, 'player')
    const res = await call(guardApp(), 'GET', '/guest', { token })
    expect(cookieFrom(res)).toBeUndefined()
    expect(db.select().from(t.sessions).all()).toHaveLength(1)
  })
})

describe('requireRole', () => {
  it('treats an expired session as no session', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const token = sessionFor(db, 'player')
    vi.setSystemTime(Date.now() + GUEST_SESSION_MS + 1000)
    expect((await call(guardApp(), 'GET', '/player', { token })).status).toBe(401)
  })

  it('treats an expired host session as no session', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const token = sessionFor(db, 'host')
    vi.setSystemTime(Date.now() + ROLE_SESSION_MS + 1000)
    expect((await call(guardApp(), 'GET', '/host', { token })).status).toBe(401)
  })

  it('treats a cookie for a deleted session as no session', async () => {
    const token = sessionFor(db, 'player')
    db.delete(t.sessions).run()
    expect((await call(guardApp(), 'GET', '/player', { token })).status).toBe(401)
  })

  it('answers a garbage cookie with 401, not 500', async () => {
    expect((await call(guardApp(), 'GET', '/player', { token: 'not-a-real-token' })).status).toBe(401)
  })

  it.each([
    ['/player', 'player', 200],
    ['/host', 'player', 403],
    ['/host', 'host', 200],
    ['/host', 'staff', 200],
    ['/staff', 'host', 403],
    ['/staff', 'staff', 200],
  ] as const)('GET %s as %s → %i', async (path, role, status) => {
    const res = await call(guardApp(), 'GET', path, { token: sessionFor(db, role) })
    expect(res.status).toBe(status)
  })

  it('returns 401 with no session', async () => {
    const res = await call(guardApp(), 'GET', '/host')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthenticated' })
  })
})

describe('WebSocket upgrade', () => {
  const upgrade = { upgrade: 'websocket', connection: 'Upgrade', host: 'localhost:5173' }

  it('rejects a foreign Origin', async () => {
    const { app } = makeTestApp()
    const res = await call(app, 'GET', '/ws', { headers: { ...upgrade, origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
  })

  it('rejects a missing Origin', async () => {
    const { app } = makeTestApp()
    expect((await call(app, 'GET', '/ws', { headers: upgrade })).status).toBe(403)
  })

  it('lets a same-origin request through the origin check', async () => {
    const { app } = makeTestApp()
    const res = await call(app, 'GET', '/ws', { headers: { ...upgrade, origin: 'http://localhost:5173' } })
    expect(res.status).not.toBe(403)
  })
})

describe('environment', () => {
  const strong = { HOST_PASSCODE: 'host-passcode-long', STAFF_PASSCODE: 'staff-passcode-long' }

  it('allows development without passcodes', () => {
    expect(EnvSchema.safeParse({ NODE_ENV: 'development', HOST_PASSCODE: '', STAFF_PASSCODE: '' }).success).toBe(true)
  })

  it('requires both passcodes in production', () => {
    expect(EnvSchema.safeParse({ NODE_ENV: 'production', HOST_PASSCODE: strong.HOST_PASSCODE }).success).toBe(false)
    expect(EnvSchema.safeParse({ NODE_ENV: 'production', ...strong }).success).toBe(true)
  })

  it('requires production passcodes of at least 12 characters', () => {
    expect(EnvSchema.safeParse({ NODE_ENV: 'production', HOST_PASSCODE: 'short', STAFF_PASSCODE: strong.STAFF_PASSCODE }).success).toBe(
      false,
    )
  })

  it('rejects identical host and staff passcodes in any environment', () => {
    for (const NODE_ENV of ['development', 'production']) {
      expect(EnvSchema.safeParse({ NODE_ENV, HOST_PASSCODE: 'same-passcode-12', STAFF_PASSCODE: 'same-passcode-12' }).success).toBe(
        false,
      )
    }
  })
})

describe('expired session cleanup', () => {
  it('deletes only expired sessions and says how many', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.UTC(2026, 9, 29) })
    const live = createSession(db, { role: 'player', playerId: null }).session
    const host = createSession(db, { role: 'host', playerId: null }).session
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000) // the host session's 12 hours are up

    expect(deleteExpiredSessions(db)).toBe(1)
    expect(db.select({ id: t.sessions.id }).from(t.sessions).all()).toEqual([{ id: live.id }])
    expect(host.id).not.toBe(live.id)
    expect(deleteExpiredSessions(db)).toBe(0)
  })
})
