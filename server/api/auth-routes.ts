import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { LoginInput } from '../../shared/api'
import { clientIp } from '../auth/client-ip'
import { publicRoute } from '../auth/guards'
import { matchPasscode } from '../auth/login'
import { createRateLimiter } from '../auth/rate-limit'
import { rotateSession } from '../auth/sessions'
import type { AppDeps, AppEnv } from '../context'
import { players } from '../db/schema'
import { validate } from './validate'

export function createAuthRoutes(deps: AppDeps) {
  // Every login attempt counts, right or wrong: 5 per minute per IP (docs/SPEC.md section 5).
  const limiter = createRateLimiter({ max: 5, windowMs: 60_000 })

  return (
    new Hono<AppEnv>()
      // Lets passcode screens tell whether this session already has its role.
      .get('/api/me', publicRoute(), (c) => {
        const session = c.get('session')
        if (!session) return c.json({ role: null, player: null })
        const player = session.playerId
          ? (deps.db
              .select({ id: players.id, nickname: players.nickname })
              .from(players)
              .where(eq(players.id, session.playerId))
              .get() ?? null)
          : null
        return c.json({ role: session.role, player })
      })
      .post('/api/login', publicRoute(), validate('json', LoginInput), (c) => {
        const verdict = limiter.attempt(clientIp(c))
        if (!verdict.ok) {
          c.header('Retry-After', String(verdict.retryAfterS))
          return c.json({ error: 'too_many_attempts' }, 429)
        }
        const role = matchPasscode(c.req.valid('json').passcode, deps.config)
        if (!role) return c.json({ error: 'wrong_passcode' }, 401)
        // A new token on every role change, keeping the player so their history follows them.
        const session = rotateSession(c, deps, { role, playerId: c.get('session')?.playerId ?? null })
        return c.json({ role: session.role })
      })
  )
}
