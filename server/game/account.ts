// The player's own data and the staff-configurable settings (docs/SPEC.md sections 2, 4 and 8,
// Milestone 6): post-game feedback, newsletter consent, delete_my_account, event settings.
import { and, eq } from 'drizzle-orm'
import { EventSettings } from '../../shared/settings'
import type { Db } from '../db/client'
import { events, feedback, newsletterOptins, players } from '../db/schema'
import { fail, ok, type GameResult } from './context'

/** One rating per player per event; a second submission replaces the first. */
export function submitFeedback(db: Db, { eventId, playerId, rating, comment }: { eventId: string; playerId: string; rating: number; comment?: string }): GameResult<{ ok: true }> {
  if (!db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).get()) return fail('not_found')
  db.transaction((tx) => {
    tx.delete(feedback).where(and(eq(feedback.eventId, eventId), eq(feedback.playerId, playerId))).run()
    tx.insert(feedback).values({ eventId, playerId, rating, comment: comment || null }).run()
  })
  return ok({ ok: true })
}

/** Stores the address only with the consent timestamp (the checkbox starts unticked). */
export function optInToNewsletter(db: Db, { playerId, email, topics = [] }: { playerId: string; email: string; topics?: string[] }) {
  db.insert(newsletterOptins).values({ playerId, email, topics, consentAt: Date.now(), source: 'post_game' }).run()
  return ok({ ok: true as const })
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

export function newsletterCsv(db: Db): string {
  const rows = db.select().from(newsletterOptins).all()
  const lines = rows.map((r) => [r.email, r.topics.join('|'), new Date(r.consentAt).toISOString(), r.source ?? ''].map(csvCell).join(','))
  return ['email,topics,consent_at,source', ...lines].join('\n') + '\n'
}

/**
 * delete_my_account: the player row goes, and with it (by cascade) sessions, team memberships,
 * badges and newsletter consent. Team scores stay, now unattributed, as do feedback and prize
 * rows with the player cleared (SPEC section 5: "keeps anonymized score totals").
 */
export function deleteAccount(db: Db, playerId: string) {
  db.delete(players).where(eq(players.id, playerId)).run()
  return ok({ ok: true as const })
}

export function eventSettings(db: Db, eventId: string): GameResult<{ settings: EventSettings }> {
  const row = db.select({ settings: events.settings }).from(events).where(eq(events.id, eventId)).get()
  return row ? ok({ settings: row.settings }) : fail('not_found')
}

/** Merges a partial change over the event's settings; the whole result must still be valid. */
export function updateSettings(db: Db, eventId: string, patch: Record<string, unknown>): GameResult<{ settings: EventSettings }> | { ok: false; error: 'invalid_settings'; issues: string[] } {
  const current = eventSettings(db, eventId)
  if (!current.ok) return current
  const parsed = EventSettings.safeParse({ ...current.value.settings, ...patch })
  if (!parsed.success) return { ok: false, error: 'invalid_settings', issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  db.update(events).set({ settings: parsed.data }).where(eq(events.id, eventId)).run()
  return ok({ settings: parsed.data })
}
