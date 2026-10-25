import { createMiddleware } from 'hono/factory'
import type { Role } from '../../shared/enums'
import type { AppEnv } from '../context'

export type RouteAccess = Role | 'public'

// Guards carry a tag so a test can walk app.routes and prove every /api route declares
// who may call it (docs/SPEC.md section 6, rule 1).
const ACCESS = Symbol('routeAccess')

function tagged<T extends object>(handler: T, access: RouteAccess): T {
  return Object.assign(handler, { [ACCESS]: access })
}

export function routeAccess(handler: unknown): RouteAccess | undefined {
  return typeof handler === 'function' ? (handler as { [ACCESS]?: RouteAccess })[ACCESS] : undefined
}

/** `staff` can do everything `host` can, and both can do everything `player` can. */
const RANK: Record<Role, number> = { player: 0, host: 1, staff: 2 }

export function requireRole(role: Role) {
  return tagged(
    createMiddleware<AppEnv>(async (c, next) => {
      const session = c.get('session')
      if (!session) return c.json({ error: 'unauthenticated' }, 401)
      if (RANK[session.role] < RANK[role]) return c.json({ error: 'forbidden' }, 403)
      await next()
    }),
    role,
  )
}

/** Marks a route as callable without a session. */
export function publicRoute() {
  return tagged(
    createMiddleware<AppEnv>(async (_c, next) => {
      await next()
    }),
    'public',
  )
}

/** Blocks cross-site WebSocket hijacking: the browser's Origin must match the Host it connected to. */
export function sameOrigin() {
  return createMiddleware(async (c, next) => {
    const origin = c.req.header('origin')
    const host = c.req.header('host')
    if (!origin || !host || !matchesHost(origin, host)) return c.json({ error: 'forbidden' }, 403)
    await next()
  })
}

function matchesHost(origin: string, host: string): boolean {
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
