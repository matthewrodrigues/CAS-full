import { randomUUID } from 'node:crypto'
import { parseSettings } from '../../shared/settings'
import type { Db } from '../db/client'
import * as t from '../db/schema'

/** Appears only in question_answers. If a response ever contains it, answers leaked. */
export const ANSWER_SENTINEL = 'SENTINEL-ANSWER-7f3a'
export const TEAM_A_ANSWER = 'TEAM-A-ANSWER'
export const TEAM_B_ANSWER = 'TEAM-B-ANSWER'

type TeamFixture = { id: string; captainId: string; playerIds: [string, string]; submissionId: string }

export type Fixture = {
  seasonId: string
  themeId: string
  eventId: string
  roundId: string
  questionId: string
  eventQuestionId: string
  teamA: TeamFixture
  teamB: TeamFixture
  rewardId: string
  awardId: string
}

/**
 * One live event: a typed question is open, teams A and B (two players each) have both
 * submitted, team A has a score event, player A1 has a reward award and a session.
 */
export function buildFixture(db: Db): Fixture {
  const now = Date.now()
  const id = () => randomUUID()
  const f: Fixture = {
    seasonId: id(),
    themeId: id(),
    eventId: id(),
    roundId: id(),
    questionId: id(),
    eventQuestionId: id(),
    teamA: { id: id(), captainId: '', playerIds: [id(), id()], submissionId: id() },
    teamB: { id: id(), captainId: '', playerIds: [id(), id()], submissionId: id() },
    rewardId: id(),
    awardId: id(),
  }
  f.teamA.captainId = f.teamA.playerIds[0]
  f.teamB.captainId = f.teamB.playerIds[0]

  db.insert(t.seasons).values({ id: f.seasonId, name: 'Fixture Season', startsOn: '2026-10-01', endsOn: '2026-12-31' }).run()
  db.insert(t.themes).values({ id: f.themeId, name: 'Fixture Theme', slug: 'fixture-theme', accentToken: 'depth' }).run()
  db.insert(t.events)
    .values({
      id: f.eventId,
      seasonId: f.seasonId,
      themeId: f.themeId,
      startsAt: now,
      joinCode: 'FIXT1',
      status: 'live',
      settings: parseSettings({}),
    })
    .run()
  db.insert(t.rounds).values({ id: f.roundId, eventId: f.eventId, position: 1, title: 'Round 1', format: 'standard' }).run()
  db.insert(t.questions)
    .values({ id: f.questionId, themeId: f.themeId, type: 'typed', prompt: 'Name the fixture animal', funFact: 'Fixtures are not animals.' })
    .run()
  db.insert(t.questionAnswers).values({ questionId: f.questionId, acceptedAnswers: [ANSWER_SENTINEL] }).run()
  db.insert(t.eventQuestions)
    .values({ id: f.eventQuestionId, eventId: f.eventId, roundId: f.roundId, questionId: f.questionId, position: 1, durationS: 30, points: 10 })
    .run()
  db.insert(t.gameState)
    .values({
      eventId: f.eventId,
      phase: 'live',
      currentEventQuestionId: f.eventQuestionId,
      opensAt: now,
      closesAt: now + 30_000,
      livePayload: { event_question_id: f.eventQuestionId, type: 'typed', prompt: 'Name the fixture animal', duration_s: 30 },
    })
    .run()

  for (const [team, name, answer] of [
    [f.teamA, 'Team A', TEAM_A_ANSWER],
    [f.teamB, 'Team B', TEAM_B_ANSWER],
  ] as const) {
    for (const [i, playerId] of team.playerIds.entries()) {
      db.insert(t.players).values({ id: playerId, nickname: `${name} player ${i + 1}` }).run()
    }
    db.insert(t.teams).values({ id: team.id, eventId: f.eventId, name, captainId: team.captainId, nameStatus: 'approved' }).run()
    for (const playerId of team.playerIds) {
      db.insert(t.teamMembers).values({ teamId: team.id, eventId: f.eventId, playerId }).run()
    }
    db.insert(t.submissions)
      .values({
        id: team.submissionId,
        eventQuestionId: f.eventQuestionId,
        teamId: team.id,
        answer: { text: answer },
        updatedBy: team.captainId,
        receivedAt: now,
        isDraft: false,
      })
      .run()
  }

  db.insert(t.scoreEvents).values({ id: id(), teamId: f.teamA.id, eventQuestionId: f.eventQuestionId, points: 10, reason: 'correct' }).run()
  db.insert(t.rewards).values({ id: f.rewardId, name: 'Fixture prize', tier: 1, expiresAfterDays: 30, perPersonLimit: 1 }).run()
  db.insert(t.rewardAwards)
    .values({
      id: f.awardId,
      rewardId: f.rewardId,
      playerId: f.teamA.captainId,
      code: 'ABCDEFGHJK',
      status: 'issued',
      issuedAt: now,
      expiresAt: now + 30 * 86_400_000,
    })
    .run()
  db.insert(t.sessions)
    .values({ id: 'fixture-session-hash', playerId: f.teamA.captainId, role: 'player', createdAt: now, expiresAt: now + 86_400_000 })
    .run()

  return f
}
