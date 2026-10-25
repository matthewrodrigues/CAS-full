import { randomUUID } from 'node:crypto'
import { eq, sum } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseSettings } from '../../shared/settings'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { buildFixture, type Fixture } from './fixtures'
import { makeTestDb } from './helpers'

let db: Db
let f: Fixture

beforeEach(() => {
  db = makeTestDb()
  f = buildFixture(db)
})

/** Raw SQL so the test can write values the TypeScript enum types would reject. */
function setColumn(table: string, column: string, value: unknown) {
  db.$client.prepare(`update ${table} set ${column} = ?`).run(value)
}

function insertEvent(joinCode: string) {
  db.insert(t.events)
    .values({ seasonId: f.seasonId, themeId: f.themeId, startsAt: 0, joinCode, settings: parseSettings({}) })
    .run()
}

describe('schema constraints', () => {
  it.each([
    ['events', 'status'],
    ['rounds', 'format'],
    ['questions', 'type'],
    ['questions', 'media_kind'],
    ['game_state', 'phase'],
    ['game_state', 'paused_from_phase'],
    ['players', 'display_mode'],
    ['teams', 'name_status'],
    ['submissions', 'auto_result'],
    ['submissions', 'override_result'],
    ['score_events', 'reason'],
    ['reward_awards', 'status'],
    ['sessions', 'role'],
  ])('rejects an unknown value in %s.%s', (table, column) => {
    expect(() => setColumn(table, column, 'bogus')).toThrow(`CHECK constraint failed: ${table}_${column}_check`)
  })

  it('rejects a paused_from_phase of paused', () => {
    expect(() => setColumn('game_state', 'paused_from_phase', 'paused')).toThrow('CHECK constraint failed')
  })

  it('enforces foreign keys', () => {
    const playerId = randomUUID()
    db.insert(t.players).values({ id: playerId, nickname: 'Drifter' }).run()
    expect(() => db.insert(t.teamMembers).values({ teamId: randomUUID(), eventId: f.eventId, playerId }).run()).toThrow(
      'FOREIGN KEY constraint failed',
    )
  })

  it('allows one team per player per event', () => {
    expect(() =>
      db.insert(t.teamMembers).values({ teamId: f.teamB.id, eventId: f.eventId, playerId: f.teamA.playerIds[0] }).run(),
    ).toThrow('UNIQUE constraint failed: team_members.event_id, team_members.player_id')
  })

  it("requires team_members.event_id to match the team's event", () => {
    insertEvent('FIXT2')
    const otherEvent = db.select({ id: t.events.id }).from(t.events).where(eq(t.events.joinCode, 'FIXT2')).get()!
    const playerId = randomUUID()
    db.insert(t.players).values({ id: playerId, nickname: 'Drifter' }).run()
    expect(() => db.insert(t.teamMembers).values({ teamId: f.teamA.id, eventId: otherEvent.id, playerId }).run()).toThrow(
      'FOREIGN KEY constraint failed',
    )
  })

  it('allows at most one wager round per event', () => {
    db.insert(t.rounds).values({ eventId: f.eventId, position: 2, title: 'Final', format: 'wager' }).run()
    expect(() => db.insert(t.rounds).values({ eventId: f.eventId, position: 3, title: 'Final again', format: 'wager' }).run()).toThrow(
      'UNIQUE constraint failed',
    )
  })

  it('stores one submission per team per question', () => {
    expect(() =>
      db
        .insert(t.submissions)
        .values({ eventQuestionId: f.eventQuestionId, teamId: f.teamA.id, answer: { text: 'again' }, receivedAt: 0, isDraft: true })
        .run(),
    ).toThrow('UNIQUE constraint failed: submissions.event_question_id, submissions.team_id')
  })

  it.each(['abc', 'demo1', 'TOOLONG', 'DEM-1'])('rejects join code %s', (joinCode) => {
    expect(() => insertEvent(joinCode)).toThrow('CHECK constraint failed: events_join_code_check')
  })

  it('accepts a 4-character uppercase join code', () => {
    expect(() => insertEvent('AB12')).not.toThrow()
  })

  it('requires media_url exactly when media_kind is not none', () => {
    const question = (mediaKind: 'none' | 'image', mediaUrl: string | null) =>
      db.insert(t.questions).values({ themeId: f.themeId, type: 'mc', prompt: 'Q', mediaKind, mediaUrl }).run()
    expect(() => question('image', null)).toThrow('CHECK constraint failed: questions_media_url_check')
    expect(() => question('none', '/media/x.svg')).toThrow('CHECK constraint failed: questions_media_url_check')
    expect(() => question('image', '/media/x.svg')).not.toThrow()
  })

  it('requires a note on adjust score events', () => {
    const adjust = (note: string | null) =>
      db.insert(t.scoreEvents).values({ teamId: f.teamA.id, points: -5, reason: 'adjust', note }).run()
    expect(() => adjust(null)).toThrow('CHECK constraint failed: score_events_adjust_note_check')
    expect(() => adjust('   ')).toThrow('CHECK constraint failed: score_events_adjust_note_check')
    expect(() => adjust('Phone use during question 4')).not.toThrow()
  })

  it('requires redemption codes of at least 10 characters', () => {
    expect(() => setColumn('reward_awards', 'code', 'SHORT12')).toThrow('CHECK constraint failed: reward_awards_code_check')
  })

  it('keeps redeemed_at in step with status', () => {
    expect(() => setColumn('reward_awards', 'status', 'redeemed')).toThrow('CHECK constraint failed: reward_awards_redeemed_check')
    expect(() => db.update(t.rewardAwards).set({ status: 'redeemed', redeemedAt: Date.now() }).run()).not.toThrow()
  })

  it.each([0, 6])('rejects feedback rating %i', (rating) => {
    expect(() => db.insert(t.feedback).values({ eventId: f.eventId, rating }).run()).toThrow(
      'CHECK constraint failed: feedback_rating_check',
    )
  })

  it('accepts feedback rating 5', () => {
    expect(() => db.insert(t.feedback).values({ eventId: f.eventId, rating: 5 }).run()).not.toThrow()
  })

  it('keeps team score totals when a player is deleted', () => {
    const captain = f.teamA.captainId
    db.delete(t.players).where(eq(t.players.id, captain)).run()

    expect(db.select().from(t.teamMembers).where(eq(t.teamMembers.playerId, captain)).all()).toEqual([])
    expect(db.select().from(t.sessions).where(eq(t.sessions.playerId, captain)).all()).toEqual([])
    expect(db.select({ captainId: t.teams.captainId }).from(t.teams).where(eq(t.teams.id, f.teamA.id)).get()).toEqual({
      captainId: null,
    })
    expect(
      db.select({ updatedBy: t.submissions.updatedBy }).from(t.submissions).where(eq(t.submissions.id, f.teamA.submissionId)).get(),
    ).toEqual({ updatedBy: null })
    expect(db.select({ playerId: t.rewardAwards.playerId }).from(t.rewardAwards).get()).toEqual({ playerId: null })
    const total = db.select({ points: sum(t.scoreEvents.points) }).from(t.scoreEvents).where(eq(t.scoreEvents.teamId, f.teamA.id)).get()
    expect(Number(total?.points)).toBe(10)
  })
})

describe('event settings', () => {
  it('fills every default', () => {
    expect(parseSettings({})).toEqual({
      max_team_size: 6,
      team_submissions: 'any_member',
      speed_bonus: 'off',
      grace_ms: 1200,
      auto_accept_threshold: 0.8,
      review_threshold: 0.5,
      live_background: 'cream',
    })
  })

  it('rejects a review threshold above the auto-accept threshold', () => {
    expect(() => parseSettings({ review_threshold: 0.9 })).toThrow()
  })
})
