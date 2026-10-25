import { upgradeWebSocket } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { createAuthRoutes } from './api/auth-routes'
import { createGameRoutes } from './api/game-routes'
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
    .route('/', createGameRoutes(deps))
    // Question images and audio. File names are random, so they can't be guessed or give answers away.
    .use('/media/*', async (c, next) => {
      await next()
      // Hono's MIME table has no .wav, and iOS Safari won't play audio sent as octet-stream.
      if (c.res.ok && c.req.path.endsWith('.wav')) c.res.headers.set('Content-Type', 'audio/wav')
    })
    .get(
      '/media/*',
      serveStatic({ root: deps.config.mediaDir, rewriteRequestPath: (path) => path.replace(/^\/media/, '') }),
    )
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
