import { tmpdir } from 'node:os'
import { createApp } from '../app'
import { createSession, SESSION_COOKIE } from '../auth/sessions'
import type { AppConfig } from '../context'
import { applyMigrations, openDb, type Db } from '../db/client'
import { createGame } from '../game/engine'
import { createRealtime } from '../realtime/rooms'
import type { Role } from '../../shared/enums'

export const TEST_HOST_PASSCODE = 'host-passcode-for-tests'
export const TEST_STAFF_PASSCODE = 'staff-passcode-for-tests'

/** In-memory SQLite with the real generated migrations applied. */
export function makeTestDb(): Db {
  const db = openDb(':memory:')
  applyMigrations(db)
  return db
}

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    hostPasscode: TEST_HOST_PASSCODE,
    staffPasscode: TEST_STAFF_PASSCODE,
    secureCookies: false,
    mediaDir: tmpdir(),
    ...overrides,
  }
}

/** The real app on an in-memory database. Call game.stop() after a test that opens a question. */
export function makeTestApp(config: Partial<AppConfig> = {}, db: Db = makeTestDb()) {
  const realtime = createRealtime()
  const game = createGame({ db, realtime })
  return { app: createApp({ db, config: testConfig(config), game, realtime }), db, game, realtime }
}

/** A session row plus the raw cookie token a browser would hold. */
export function sessionFor(db: Db, role: Role, playerId: string | null = null): string {
  return createSession(db, { role, playerId }).token
}

type Requestable = { request: (path: string, init?: RequestInit) => Response | Promise<Response> }

export function call(
  app: Requestable,
  method: string,
  path: string,
  { token, body, headers }: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> {
  const h = new Headers(headers)
  if (token) h.set('cookie', `${SESSION_COOKIE}=${token}`)
  if (body !== undefined) h.set('content-type', 'application/json')
  return Promise.resolve(
    app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }),
  )
}

/** A response body for assertions. Tests read bodies loosely; tsc checks the routes themselves. */
// oxlint-disable-next-line typescript/no-explicit-any
export const bodyOf = (res: Response): Promise<any> => res.json()

/** The value of one cookie from a response's Set-Cookie header. */
export function cookieFrom(res: Response, name = SESSION_COOKIE): string | undefined {
  const match = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))
  return match?.slice(name.length + 1).split(';')[0]
}
