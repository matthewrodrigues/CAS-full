import { upgradeWebSocket } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Db } from './db/client'

export function createApp(db: Db) {
  return new Hono()
    .get('/api/health', (c) => {
      db.get(sql`select 1`)
      return c.json({ ok: true })
    })
    .get(
      '/ws',
      // Echo only for Milestone 0; rooms and game messages arrive in Milestone 2.
      upgradeWebSocket(() => ({
        onMessage(event, ws) {
          if (typeof event.data === 'string') ws.send(event.data)
        },
      })),
    )
}

/** Route types for the typed client in src/lib/api.ts (Milestone 1). */
export type AppType = ReturnType<typeof createApp>
