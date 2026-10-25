import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { LoginInput } from '../../shared/api'
import { clientIp } from '../auth/client-ip'
import { publicRoute } from '../auth/guards'
import { createLoginLimiter, matchPasscode } from '../auth/login'
import { rotateSession } from '../auth/sessions'
import type { AppDeps, AppEnv } from '../context'
import { players } from '../db/schema'
import { validate } from './validate'

export function createAuthRoutes(deps: AppDeps) {
  const limiter = createLoginLimiter()

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
