import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app'
import { deleteExpiredSessions } from './auth/sessions'
import type { AppConfig } from './context'
import { DB_FILE, openDb } from './db/client'
import { env } from './env'
import { createGame } from './game/engine'
import { createRealtime } from './realtime/rooms'
import { startServer } from './serve'

const config: AppConfig = {
  hostPasscode: env.HOST_PASSCODE,
  staffPasscode: env.STAFF_PASSCODE,
  secureCookies: env.NODE_ENV === 'production',
  mediaDir: join(env.DATA_DIR, 'media'),
}
for (const key of ['HOST_PASSCODE', 'STAFF_PASSCODE'] as const) {
  if (!env[key]) console.warn(`${key} is not set, so that role's login is disabled. Set it in .env.`)
}

mkdirSync(config.mediaDir, { recursive: true })
const db = openDb(DB_FILE)
const realtime = createRealtime()
const game = createGame({ db, realtime })
const app = createApp({ db, config, game, realtime })

// A question open when the last process stopped either auto-locks on schedule or locks now.
game.resumeTimers()

const SESSION_CLEANUP_MS = 6 * 60 * 60 * 1000
const cleanUpSessions = () => {
  const removed = deleteExpiredSessions(db)
  if (removed > 0) console.log(`Removed ${removed} expired sessions`)
}
cleanUpSessions()
setInterval(cleanUpSessions, SESSION_CLEANUP_MS).unref()

// After `npm run build`, this one process also serves the SPA (docs/SPEC.md section 10).
if (existsSync('dist/index.html')) {
  app.use('*', serveStatic({ root: './dist' }))
  // Client routes fall back to index.html; unknown /api, /ws and /media paths still 404.
  app.get('*', (c, next) =>
    /^\/(api|ws|media)(\/|$)/.test(c.req.path)
      ? next()
      : serveStatic({ path: './dist/index.html' })(c, next),
  )
}

const server = startServer(app.fetch, env.PORT, (port) => console.log(`API listening on http://localhost:${port}`))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    game.stop()
    server.close()
    db.$client.close()
    process.exit(0)
  })
}
