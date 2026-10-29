// docs/SPEC.md section 6, rule 3: live_payload never contains answer fields, for every type.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import { buildLivePayload, buildWagerPayload } from '../game/live-payload'
import { buildRevealPayload, skippedRevealPayload } from '../game/reveal'
import { makeTestDb } from './helpers'

let db: Db
let mediaDir: string

beforeAll(() => {
  db = makeTestDb()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-payloads-'))
  seedDemo(db, { mediaDir })
})

afterAll(() => {
  rmSync(mediaDir, { recursive: true, force: true })
})

function seeded() {
  return db
    .select({ eq: t.eventQuestions, question: t.questions, answer: t.questionAnswers, round: t.rounds })
    .from(t.eventQuestions)
    .innerJoin(t.questions, eq(t.questions.id, t.eventQuestions.questionId))
    .innerJoin(t.questionAnswers, eq(t.questionAnswers.questionId, t.questions.id))
    .innerJoin(t.rounds, eq(t.rounds.id, t.eventQuestions.roundId))
    .orderBy(asc(t.rounds.position), asc(t.eventQuestions.position))
    .all()
}

const byPrompt = (fragment: string) => seeded().find((r) => r.question.prompt.includes(fragment))!

describe('buildLivePayload', () => {
  it('never carries answer fields, the fun fact, or a typed answer, for any seeded question', () => {
    const questions = seeded().filter((r) => r.round.format !== 'wager')
    expect(questions).toHaveLength(28)
    for (const { eq: eventQuestion, question, answer } of questions) {
      const json = JSON.stringify(buildLivePayload(db, eventQuestion.id))
      expect(json).toContain(JSON.stringify(question.prompt).slice(1, -1))
      for (const key of ['accepted_answers', 'correct_option', 'correct_text', 'numeric_answer', 'fun_fact']) {
        expect(json).not.toContain(key)
      }
      expect(json).not.toContain(question.funFact!)
      if (question.type === 'typed') {
        for (const accepted of answer.acceptedAnswers) expect(json.toLowerCase()).not.toContain(accepted.toLowerCase())
      }
    }
  })

  it('describes the question for players', () => {
    const { eq: eventQuestion, question } = byPrompt('deepest known point')
    expect(buildLivePayload(db, eventQuestion.id)).toEqual({
      event_question_id: eventQuestion.id,
      round: { position: 1, title: 'Into the Abyss', format: 'standard' },
      number: 1,
      of: 10,
      type: 'mc',
      prompt: question.prompt,
      options: ['Challenger Deep', 'Puerto Rico Trench', 'Tonga Trench', 'Java Trench'],
      media_kind: 'none',
      media_url: null,
      caption: null,
      duration_s: 20,
      points: 10,
    })
  })

  it('leaves options null for true/false and carries media and captions', () => {
    const tf = byPrompt('Sunlight reaches')
    expect(buildLivePayload(db, tf.eq.id)).toMatchObject({ type: 'true_false', options: null })
    const sound = byPrompt('Snapping shrimp')
    expect(buildLivePayload(db, sound.eq.id)).toMatchObject({
      media_kind: 'audio',
      media_url: sound.question.mediaUrl,
      caption: '[Constant crackling, like bacon frying]',
    })
  })

  it('hides the prompt during the wager', () => {
    const final = seeded().find((r) => r.round.format === 'wager')!
    const payload = buildWagerPayload(db, final.eq.id)
    expect(payload).toEqual({ event_question_id: final.eq.id, round: { position: 4, title: 'Final Wager', format: 'wager' }, wager: true })
    expect(JSON.stringify(payload)).not.toContain(final.question.prompt)
  })
})

describe('buildRevealPayload', () => {
  it.each([
    ['deepest known point', { type: 'mc', correct_option: 0, correct_text: 'Challenger Deep', numeric_answer: null }],
    ['Sunlight reaches', { type: 'true_false', correct_option: 1, correct_text: null, numeric_answer: null }],
    ['three hearts and blue blood', { type: 'typed', correct_option: null, correct_text: 'octopus', numeric_answer: null }],
    ['Piccard and Don Walsh', { type: 'closest_number', correct_option: null, correct_text: null, numeric_answer: 1960 }],
  ] as const)('reveals the answer and fun fact for "%s"', (fragment, expected) => {
    const { eq: eventQuestion, question } = byPrompt(fragment)
    expect(buildRevealPayload(db, eventQuestion.id)).toEqual({
      event_question_id: eventQuestion.id,
      ...expected,
      fun_fact: question.funFact,
    })
  })

  it('marks a skipped question', () => {
    expect(skippedRevealPayload('eq-1')).toEqual({ event_question_id: 'eq-1', skipped: true })
  })
})
