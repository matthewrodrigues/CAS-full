// Milestone 2 done-when: a full scripted game runs from lobby to ended (docs/SPEC.md section 8).
// Everything goes over HTTP, as the Milestone 3 and 4 clients will; the clock is faked.
//
// Hand-computed totals, 28 ten-point questions plus the final wager:
//   Know-it-alls  every answer right, wagers 100 and is right    28 × 10 + 100 = 380, rank 1
//   Halfway       round 1 right (10 questions), the rest wrong,
//                 wagers 50 and misses                            10 × 10 − 50  =  50, rank 2
//   Guessers      every answer wrong, so can only wager 0                         0, rank 3
// Halfway is also exactly right on round 1's two closest-number questions, so it shares those
// points with Know-it-alls; Guessers' 1,000,000 is never closest.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Answer } from '../../shared/api'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import { bodyOf, call, cookieFrom, makeTestApp, TEST_HOST_PASSCODE } from './helpers'

let test: ReturnType<typeof makeTestApp>
let mediaDir: string
let eventId: string

beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 9, 29, 2, 0), toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  test = makeTestApp()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-full-'))
  eventId = seedDemo(test.db, { mediaDir }).eventId
})

afterEach(() => {
  test.game.stop()
  vi.useRealTimers()
  rmSync(mediaDir, { recursive: true, force: true })
})

async function ok(res: Response | Promise<Response>) {
  const response = await res
  const body = await bodyOf(response)
  expect({ status: response.status, body }).toMatchObject({ status: 200 })
  return body
}

/** Tests may read answers; the app never sends them. */
function answersFor(eventQuestionId: string) {
  return test.db
    .select({
      type: t.questions.type,
      options: t.questions.options,
      format: t.rounds.format,
      round: t.rounds.position,
      accepted: t.questionAnswers.acceptedAnswers,
      correctOption: t.questionAnswers.correctOption,
      numeric: t.questionAnswers.numericAnswer,
    })
    .from(t.eventQuestions)
    .innerJoin(t.questions, eq(t.questions.id, t.eventQuestions.questionId))
    .innerJoin(t.questionAnswers, eq(t.questionAnswers.questionId, t.questions.id))
    .innerJoin(t.rounds, eq(t.rounds.id, t.eventQuestions.roundId))
    .where(eq(t.eventQuestions.id, eventQuestionId))
    .get()!
}

function answer(q: ReturnType<typeof answersFor>, right: boolean): Answer {
  switch (q.type) {
    case 'mc':
      return { option: right ? q.correctOption! : (q.correctOption! + 1) % q.options!.length }
    case 'true_false':
      return { option: right ? q.correctOption! : 1 - q.correctOption! }
    case 'typed':
      return { text: right ? q.accepted[0] : 'no idea' }
    case 'closest_number':
      return { number: right ? q.numeric! : 1_000_000 }
  }
}

it('plays DEMO1 from lobby to ended over HTTP and ranks the teams', { timeout: 30_000 }, async () => {
  const login = await call(test.app, 'POST', '/api/login', { body: { passcode: TEST_HOST_PASSCODE } })
  const host = cookieFrom(login)!
  const hostDoes = (operation: string) => ok(call(test.app, 'POST', `/api/${operation}`, { token: host, body: { event_id: eventId } }))

  const teams: Record<string, { token: string; id: string; right: (round: number) => boolean; wager: number }> = {}
  for (const [name, right, wager] of [
    ['Know-it-alls', () => true, 100],
    ['Guessers', () => false, 0],
    ['Halfway', (round: number) => round === 1, 50],
  ] as const) {
    const joined = await call(test.app, 'POST', '/api/join_event', { body: { join_code: 'DEMO1', nickname: `${name} captain` } })
    const token = cookieFrom(joined)!
    const team = await ok(call(test.app, 'POST', '/api/create_team', { token, body: { event_id: eventId, name } }))
    await ok(call(test.app, 'POST', '/api/host_review_team_name', { token: host, body: { team_id: team.id, name_status: 'approved' } }))
    teams[name] = { token, id: team.id, right, wager }
  }

  const state = async () => (await ok(call(test.app, 'GET', `/api/get_state?event_id=${eventId}`, { token: host }))).state
  let questions = 0
  let autoLocked = 0
  let s = await state()
  expect(s.phase).toBe('lobby')

  while (s.phase !== 'ended') {
    if (s.phase === 'final_wager') {
      for (const team of Object.values(teams)) {
        await ok(call(test.app, 'POST', '/api/submit_wager', { token: team.token, body: { event_question_id: s.current_event_question_id, amount: team.wager } }))
      }
    }
    if (s.phase === 'live' || s.phase === 'final_live') {
      const q = answersFor(s.current_event_question_id)
      const final = s.phase === 'final_live'
      for (const [name, team] of Object.entries(teams)) {
        const right = final ? name === 'Know-it-alls' : team.right(q.round)
        await ok(
          call(test.app, 'POST', '/api/submit_answer', {
            token: team.token,
            body: { event_question_id: s.current_event_question_id, answer: answer(q, right), is_draft: false },
          }),
        )
      }
      questions++
      if (questions === 2 || questions === 3) {
        // Round 1's questions 2 and 3 run out the clock and lock themselves.
        vi.advanceTimersByTime(s.closes_at - Date.now() + 1200)
        expect((await state()).phase).toBe('locked')
        autoLocked++
      } else {
        await hostDoes('host_lock')
      }
      await hostDoes('host_reveal')
    } else {
      await hostDoes('host_next')
    }
    vi.advanceTimersByTime(1000) // a beat between steps, which also keeps writes under 5 per second
    s = await state()
  }

  expect({ questions, autoLocked }).toEqual({ questions: 29, autoLocked: 2 })
  expect(test.db.select({ status: t.events.status }).from(t.events).where(eq(t.events.id, eventId)).get()!.status).toBe('ended')
  const board = await ok(call(test.app, 'GET', `/api/get_leaderboard?event_id=${eventId}`, { token: teams.Guessers.token }))
  expect(board.teams.map((r: { name: string; points: number; rank: number }) => [r.name, r.points, r.rank])).toEqual([
    ['Know-it-alls', 380, 1],
    ['Halfway', 50, 2],
    ['Guessers', 0, 3],
  ])
})
