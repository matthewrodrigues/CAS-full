import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { events, players, themes } from '../db/schema'
import { publicGameState } from './state'
import { isProfane, teamOf } from './teams'

type JoinError = 'not_found' | 'event_ended' | 'nickname_not_allowed'

/**
 * join_event(join_code, nickname): finds a joinable event and creates or renames the player.
 * Draft events are hidden (not_found) and ended ones refuse new players. Nicknames get the
 * same profanity check as team names, since other players see them on the season board.
 */
export function joinEvent(db: Db, { joinCode, nickname, playerId }: { joinCode: string; nickname: string; playerId: string | null }) {
  if (isProfane(nickname)) return { ok: false as const, error: 'nickname_not_allowed' as JoinError }
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
  // An ended night takes no one new, but a player who played can come back for their prizes.
  if (event.status === 'ended' && !(playerId && teamOf(db, event.id, playerId))) return { ok: false as const, error: 'event_ended' as JoinError }

  let id = playerId
  if (id) {
    db.update(players).set({ nickname }).where(eq(players.id, id)).run()
  } else {
    id = randomUUID()
    db.insert(players).values({ id, nickname }).run()
  }
  return { ok: true as const, value: { event, state, player: { id, nickname } } }
}
