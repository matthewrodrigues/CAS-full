import { existsSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { WebSocketServer } from 'ws'
import { createApp } from './app'
import { DB_FILE, openDb } from './db/client'
import { env } from './env'

const db = openDb(DB_FILE)
const app = createApp(db)

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

const server = serve(
  { fetch: app.fetch, port: env.PORT, websocket: { server: new WebSocketServer({ noServer: true }) } },
  (info) => console.log(`API listening on http://localhost:${info.port}`),
)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close()
    db.$client.close()
    process.exit(0)
  })
}
