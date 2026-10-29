// /ws?event_id=… (docs/SPEC.md section 5, Real-time). Checks run in order: same Origin (403),
// a session (401), a valid event_id (400) and a visible event (404); only then the upgrade.
// The socket joins its event's room, its team's room (players) or the host room (host, staff).
// The only client message is a zod-validated ping; all game writes go over HTTP.
import { upgradeWebSocket } from '@hono/node-server'
import { and, eq, ne } from 'drizzle-orm'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { EventIdInput } from '../../shared/api'
import { ClientMessage, type ServerMessage } from '../../shared/messages'
import { sameOrigin } from '../auth/guards'
import { loadSession } from '../auth/sessions'
import type { AppDeps, AppEnv } from '../context'
import { events } from '../db/schema'
import { publicGameState } from '../game/state'
import { teamOf } from '../game/teams'

export function createWsRoute({ db, realtime }: AppDeps) {
  const admit = createMiddleware<AppEnv>(async (c, next) => {
    const session = c.get('session')
    if (!session) return c.json({ error: 'unauthenticated' }, 401)
    const query = EventIdInput.safeParse({ event_id: c.req.query('event_id') })
    if (!query.success) return c.json({ error: 'invalid_input' }, 400)
    const event = db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, query.data.event_id), ne(events.status, 'draft')))
      .get()
    if (!event) return c.json({ error: 'not_found' }, 404)
    await next()
  })

  return new Hono<AppEnv>().get(
    '/ws',
    sameOrigin(),
    loadSession(db),
    admit,
    upgradeWebSocket((c) => {
      const session = c.get('session')!
      const eventId = c.req.query('event_id')!
      const send = (ws: { send(data: string): void }, message: ServerMessage) => ws.send(JSON.stringify(message))
      let leave = () => {}
      return {
        onOpen(_event, ws) {
          const state = publicGameState(db, eventId)
          // State first, then the rooms: nothing can be broadcast in between (one thread).
          if (state) send(ws, { type: 'state', state })
          const playerId = session.playerId
          leave = realtime.add(ws, {
            eventId,
            playerId,
            teamId: playerId ? teamOf(db, eventId, playerId) : null,
            isHost: session.role !== 'player',
          })
        },
        onMessage(event, ws) {
          let data: unknown
          try {
            data = JSON.parse(String(event.data))
          } catch {
            return
          }
          if (ClientMessage.safeParse(data).success) send(ws, { type: 'pong' })
        },
        onClose() {
          leave()
        },
      }
    }),
  )
}
