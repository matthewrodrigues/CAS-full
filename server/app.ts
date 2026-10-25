import { upgradeWebSocket } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { createAuthRoutes } from './api/auth-routes'
import { publicRoute, sameOrigin } from './auth/guards'
import { loadSession } from './auth/sessions'
import type { AppDeps, AppEnv } from './context'

export function createApp(deps: AppDeps) {
  const { db } = deps
  return new Hono<AppEnv>()
    .use('/api/*', loadSession(db))
    .get('/api/health', publicRoute(), (c) => {
      db.get(sql`select 1`)
      return c.json({ ok: true })
    })
    .route('/', createAuthRoutes(deps))
    .get(
      '/ws',
      sameOrigin(),
      // Echo until Milestone 2 replaces it with event and team rooms (and session auth on the socket).
      upgradeWebSocket(() => ({
        onMessage(event, ws) {
          if (typeof event.data === 'string') ws.send(event.data)
        },
      })),
    )
}

/** Route types for the typed client in src/lib/api.ts (Milestone 3). */
export type AppType = ReturnType<typeof createApp>
