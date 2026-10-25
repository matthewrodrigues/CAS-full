import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Role } from '../../shared/enums'
import type { AppDeps, AppEnv } from '../context'
import type { Db } from '../db/client'
import { sessions } from '../db/schema'

export const SESSION_COOKIE = 'nl_session'
/** Long enough for a season, so the season leaderboard can follow a guest across nights. */
export const GUEST_SESSION_MS = 180 * 24 * 60 * 60 * 1000
/** Host and staff sessions last one night. */
export const ROLE_SESSION_MS = 12 * 60 * 60 * 1000

export type Session = { id: string; playerId: string | null; role: Role; expiresAt: number }

/** Session ids are the SHA-256 of the cookie token; the token itself is never stored. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(db: Db, { role, playerId }: { role: Role; playerId: string | null }) {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  const session: Session = {
    id: hashToken(token),
    playerId,
    role,
    expiresAt: now + (role === 'player' ? GUEST_SESSION_MS : ROLE_SESSION_MS),
  }
  db.insert(sessions)
    .values({ ...session, createdAt: now })
    .run()
  return { token, session }
}

/** The live session for a cookie token, or null when it is unknown or expired. */
export function findSession(db: Db, token: string): Session | null {
  const row = db
    .select({ id: sessions.id, playerId: sessions.playerId, role: sessions.role, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, Date.now())))
    .get()
  return row ?? null
}

export function loadSession(db: Db) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    c.set('session', token ? findSession(db, token) : null)
    await next()
  })
}

function issue(c: Context<AppEnv>, { db, config }: AppDeps, role: Role, playerId: string | null): Session {
  const { token, session } = createSession(db, { role, playerId })
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.secureCookies,
    path: '/',
    maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
  })
  c.set('session', session)
  return session
}

/** The request's session, or a new guest session (and cookie) when it has none. */
export function ensureGuestSession(c: Context<AppEnv>, deps: AppDeps): Session {
  return c.get('session') ?? issue(c, deps, 'player', null)
}

/** Replaces the current session with a new token, e.g. after a role change at login. */
export function rotateSession(
  c: Context<AppEnv>,
  deps: AppDeps,
  { role, playerId }: { role: Role; playerId: string | null },
): Session {
  const current = c.get('session')
  if (current) deps.db.delete(sessions).where(eq(sessions.id, current.id)).run()
  return issue(c, deps, role, playerId)
}

export function linkSessionPlayer(db: Db, sessionId: string, playerId: string) {
  db.update(sessions).set({ playerId }).where(eq(sessions.id, sessionId)).run()
}
