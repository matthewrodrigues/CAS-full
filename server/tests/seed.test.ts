import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QUESTION_TYPES } from '../../shared/enums'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import { validateQuestion, validateRounds } from '../game/content-rules'
import { call, makeTestApp, makeTestDb } from './helpers'

let db: Db
let mediaDir: string

beforeEach(() => {
  db = makeTestDb()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-media-'))
})

afterEach(() => {
  rmSync(mediaDir, { recursive: true, force: true })
})

/** Every seeded question with its round and answer row. */
function seededQuestions() {
  return db
    .select({ question: t.questions, answer: t.questionAnswers, round: t.rounds, eq: t.eventQuestions })
    .from(t.eventQuestions)
    .innerJoin(t.questions, eq(t.questions.id, t.eventQuestions.questionId))
    .innerJoin(t.questionAnswers, eq(t.questionAnswers.questionId, t.questions.id))
    .innerJoin(t.rounds, eq(t.rounds.id, t.eventQuestions.roundId))
    .orderBy(asc(t.rounds.position), asc(t.eventQuestions.position))
    .all()
}

describe('seedDemo', () => {
  it('seeds one season, theme, event DEMO1, 4 rounds, 29 questions and 3 rewards', () => {
    const { eventId, created } = seedDemo(db, { mediaDir })

    expect(created).toBe(true)
    expect(db.select().from(t.seasons).all()).toHaveLength(1)
    expect(db.select().from(t.themes).all()).toMatchObject([{ name: 'Deep Sea Night', slug: 'deep-sea-night' }])
    expect(db.select().from(t.events).all()).toMatchObject([{ id: eventId, joinCode: 'DEMO1', status: 'ready' }])
    expect(db.select().from(t.gameState).all()).toMatchObject([{ eventId, phase: 'lobby' }])
    expect(db.select().from(t.rounds).all()).toHaveLength(4)
    expect(db.select().from(t.questions).all()).toHaveLength(29)
    expect(db.select().from(t.questionAnswers).all()).toHaveLength(29)
    expect(db.select().from(t.rewards).all()).toHaveLength(3)
  })

  it('covers every question type in each of rounds 1-3, with images in round 2 and audio in round 3', () => {
    seedDemo(db, { mediaDir })
    const rows = seededQuestions()
    const byRound = (position: number) => rows.filter((r) => r.round.position === position)

    expect(byRound(1).map((r) => r.question.mediaKind)).toEqual(Array(10).fill('none'))
    expect(byRound(2).map((r) => r.question.mediaKind)).toEqual(Array(9).fill('image'))
    expect(byRound(3).map((r) => r.question.mediaKind)).toEqual(Array(9).fill('audio'))
    for (const position of [1, 2, 3]) {
      expect(new Set(byRound(position).map((r) => r.question.type))).toEqual(new Set(QUESTION_TYPES))
    }
    expect(byRound(2)[0].round.format).toBe('picture')
    expect(byRound(3)[0].round.format).toBe('sound')
  })

  it('makes the wager round last, with one typed question worth 0 points', () => {
    seedDemo(db, { mediaDir })
    const rounds = db.select().from(t.rounds).orderBy(asc(t.rounds.position)).all()
    expect(rounds.map((r) => r.format)).toEqual(['standard', 'picture', 'sound', 'wager'])
    expect(validateRounds(rounds)).toEqual([])
    const wager = seededQuestions().filter((r) => r.round.format === 'wager')
    expect(wager).toHaveLength(1)
    expect(wager[0].question.type).toBe('typed')
    expect(wager[0].eq.points).toBe(0)
  })

  it('gives every question valid answers, a fun fact and a difficulty of 1-3', () => {
    seedDemo(db, { mediaDir })
    for (const { question, answer } of seededQuestions()) {
      expect({ prompt: question.prompt, problems: validateQuestion(question, answer) }).toEqual({ prompt: question.prompt, problems: [] })
      expect(question.funFact?.length).toBeGreaterThan(10)
      expect([1, 2, 3]).toContain(question.difficulty)
    }
  })

  it('sets durations of 20 s for mc and true/false, 30 s for typed and closest number, 45 s for the wager', () => {
    seedDemo(db, { mediaDir })
    const expected = { mc: 20, true_false: 20, typed: 30, closest_number: 30 }
    for (const { question, round, eq: eventQuestion } of seededQuestions()) {
      expect(eventQuestion.durationS).toBe(round.format === 'wager' ? 45 : expected[question.type])
    }
  })

  it('stores media under random names that exist in mediaDir', () => {
    seedDemo(db, { mediaDir })
    const media = seededQuestions().filter((r) => r.question.mediaKind !== 'none')
    expect(media).toHaveLength(18)
    for (const { question } of media) {
      expect(question.mediaUrl).toMatch(/^\/media\/[0-9a-f-]{36}\.(svg|wav)$/)
      expect(existsSync(join(mediaDir, basename(question.mediaUrl!)))).toBe(true)
    }
  })

  it('captions every audio question', () => {
    seedDemo(db, { mediaDir })
    for (const { question } of seededQuestions().filter((r) => r.question.mediaKind === 'audio')) {
      expect(question.caption?.length).toBeGreaterThan(3)
    }
  })

  it('seeds another event under its own join code and settings, sharing the season and theme', () => {
    const demo = seedDemo(db, { mediaDir })
    const other = seedDemo(db, { mediaDir, joinCode: 'E2EA1', settings: { team_submissions: 'captain_only' } })

    expect(other.created).toBe(true)
    expect(other.eventId).not.toBe(demo.eventId)
    const event = db.select().from(t.events).where(eq(t.events.id, other.eventId)).get()!
    expect(event).toMatchObject({ joinCode: 'E2EA1', status: 'ready' })
    expect(event.settings).toMatchObject({ team_submissions: 'captain_only', max_team_size: 6, grace_ms: 1200 })
    expect(db.select().from(t.seasons).all()).toHaveLength(1)
    expect(db.select().from(t.themes).all()).toHaveLength(1)
    expect(db.select().from(t.eventQuestions).where(eq(t.eventQuestions.eventId, other.eventId)).all()).toHaveLength(29)
    expect(db.select().from(t.rewards).all()).toHaveLength(3)
    expect(seedDemo(db, { mediaDir, joinCode: 'E2EA1' })).toEqual({ eventId: other.eventId, created: false })
  })

  it('does nothing when DEMO1 already exists', () => {
    const first = seedDemo(db, { mediaDir })
    const counts = () => [t.events, t.questions, t.rewards, t.rounds].map((table) => db.select().from(table).all().length)
    const before = counts()

    const second = seedDemo(db, { mediaDir })

    expect(second).toEqual({ eventId: first.eventId, created: false })
    expect(counts()).toEqual(before)
  })
})

describe('GET /media', () => {
  it('serves a seeded file and 404s an unknown name', async () => {
    const { app, db: appDb } = makeTestApp({ mediaDir })
    seedDemo(appDb, { mediaDir })
    const image = appDb.select().from(t.questions).where(eq(t.questions.mediaKind, 'image')).get()!

    const res = await call(app, 'GET', image.mediaUrl!)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^image\/svg\+xml/)
    expect((await call(app, 'GET', '/media/00000000-0000-0000-0000-000000000000.svg')).status).toBe(404)
  })

  it('serves seeded audio as audio/wav so phone browsers will play it', async () => {
    const { app, db: appDb } = makeTestApp({ mediaDir })
    seedDemo(appDb, { mediaDir })
    const audio = appDb.select().from(t.questions).where(eq(t.questions.mediaKind, 'audio')).get()!

    const res = await call(app, 'GET', audio.mediaUrl!)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/wav')
  })

  it('never serves files outside mediaDir', async () => {
    const { app } = makeTestApp({ mediaDir })
    const secret = join(dirname(mediaDir), `${basename(mediaDir)}-secret.txt`)
    writeFileSync(secret, 'secret')
    try {
      for (const path of [`/media/../${basename(secret)}`, `/media/%2e%2e/${basename(secret)}`]) {
        const res = await call(app, 'GET', path)
        expect(await res.text()).not.toContain('secret')
      }
    } finally {
      rmSync(secret, { force: true })
    }
  })
})

describe('validateRounds', () => {
  it('rejects a wager round that is not last', () => {
    expect(validateRounds([{ position: 1, format: 'wager' }, { position: 2, format: 'standard' }])).not.toEqual([])
  })

  it('rejects two wager rounds', () => {
    expect(validateRounds([{ position: 1, format: 'wager' }, { position: 2, format: 'wager' }])).not.toEqual([])
  })

  it('accepts an event without a wager round', () => {
    expect(validateRounds([{ position: 1, format: 'standard' }, { position: 2, format: 'picture' }])).toEqual([])
  })
})

describe('validateQuestion', () => {
  const answer = { acceptedAnswers: [] as string[], correctOption: null as number | null, numericAnswer: null as number | null }
  const question = { type: 'mc' as const, options: ['A', 'B'] as string[] | null, mediaKind: 'none' as const, mediaUrl: null, caption: null }

  it.each([
    ['mc with the answer out of range', question, { ...answer, correctOption: 2 }],
    ['mc with one option', { ...question, options: ['A'] }, { ...answer, correctOption: 0 }],
    ['true_false with options', { ...question, type: 'true_false' as const }, { ...answer, correctOption: 0 }],
    ['true_false answered 2', { ...question, type: 'true_false' as const, options: null }, { ...answer, correctOption: 2 }],
    ['typed with no accepted answers', { ...question, type: 'typed' as const, options: null }, answer],
    ['typed with a blank accepted answer', { ...question, type: 'typed' as const, options: null }, { ...answer, acceptedAnswers: [' '] }],
    ['closest_number with no number', { ...question, type: 'closest_number' as const, options: null }, answer],
    ['audio without a caption', { ...question, mediaKind: 'audio' as const, mediaUrl: '/media/x.wav' }, { ...answer, correctOption: 0 }],
  ])('rejects %s', (_label, q, a) => {
    expect(validateQuestion(q, a)).not.toEqual([])
  })

  it('accepts a well-formed mc question', () => {
    expect(validateQuestion(question, { ...answer, correctOption: 1 })).toEqual([])
  })
})
