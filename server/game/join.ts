import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { events, players, themes } from '../db/schema'
import { publicGameState } from './state'

type JoinError = 'not_found' | 'event_ended'

/**
 * join_event(join_code, nickname): finds a joinable event and creates or renames the player.
 * Draft events are hidden (not_found) and ended ones refuse new players.
 */
export function joinEvent(db: Db, { joinCode, nickname, playerId }: { joinCode: string; nickname: string; playerId: string | null }) {
  const event = db
    .select({
      id: events.id,
      join_code: events.joinCode,
      starts_at: events.startsAt,
      status: events.status,
      theme: { name: themes.name, slug: themes.slug, accent_token: themes.accentToken },
    })
    .from(events)
    .innerJoin(themes, eq(themes.id, events.themeId))
    .where(eq(events.joinCode, joinCode))
    .get()
  const state = event && event.status !== 'draft' ? publicGameState(db, event.id) : null
  if (!event || !state) return { ok: false as const, error: 'not_found' as JoinError }
  if (event.status === 'ended') return { ok: false as const, error: 'event_ended' as JoinError }

  let id = playerId
  if (id) {
    db.update(players).set({ nickname }).where(eq(players.id, id)).run()
  } else {
    id = randomUUID()
    db.insert(players).values({ id, nickname }).run()
  }
  return { ok: true as const, value: { event, state, player: { id, nickname } } }
}
