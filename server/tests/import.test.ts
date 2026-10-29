import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from '../db/client'
import { importQuestions, parseQuestionsCsv } from '../db/import-questions'
import * as t from '../db/schema'
import { makeTestDb } from './helpers'

const HEADER = 'theme,type,prompt,options,correct,accepted,number,media,media_url,caption,fun_fact,difficulty,author'
const csv = (...rows: string[]) => [HEADER, ...rows].join('\n')

let db: Db
let mediaDir: string

beforeEach(() => {
  db = makeTestDb()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-import-'))
})
afterEach(() => rmSync(mediaDir, { recursive: true, force: true }))

describe('parseQuestionsCsv', () => {
  it('reads every question type', () => {
    const { rows, errors } = parseQuestionsCsv(
      csv(
        'reef-night,mc,Which fish is orange?,Clownfish | Tang | Grouper,A,,,none,,,Clownfish live in anemones.,1,Ana',
        'reef-night,typed,Name the largest reef.,,,"great barrier reef | the great barrier reef",,none,,,,2,',
        'reef-night,true_false,Coral is an animal.,,true,,,none,,,,,',
        'reef-night,closest_number,How long is the Great Barrier Reef in km?,,,,2300,none,,,,3,',
      ),
    )
    expect(errors).toEqual([])
    expect(rows.map((r) => [r.question.type, r.answer])).toEqual([
      ['mc', { acceptedAnswers: [], correctOption: 0, numericAnswer: null }],
      ['typed', { acceptedAnswers: ['great barrier reef', 'the great barrier reef'], correctOption: null, numericAnswer: null }],
      ['true_false', { acceptedAnswers: [], correctOption: 0, numericAnswer: null }],
      ['closest_number', { acceptedAnswers: [], correctOption: null, numericAnswer: 2300 }],
    ])
    expect(rows[0].question).toMatchObject({ options: ['Clownfish', 'Tang', 'Grouper'], funFact: 'Clownfish live in anemones.', difficulty: 1, author: 'Ana' })
  })

  it('accepts the correct option as a letter or as its text', () => {
    const { rows } = parseQuestionsCsv(csv('reef-night,mc,Pick one,Red | Blue,Blue,,,none,,,,,'))
    expect(rows[0].answer.correctOption).toBe(1)
  })

  it('reports every bad row by its line number, keeping only the good ones', () => {
    const { rows, errors } = parseQuestionsCsv(
      csv(
        'reef-night,mc,Fine,One | Two,A,,,none,,,,,',
        'reef-night,riddle,What?,,,,,none,,,,,',
        'reef-night,mc,Only one option,Solo,A,,,none,,,,,',
        ',typed,,,,,,none,,,,,',
        'reef-night,closest_number,How many?,,,,lots,none,,,,,',
        'reef-night,true_false,Sound?,,true,,,audio,https://example.com/a.wav,,,,',
      ),
    )
    expect(rows).toHaveLength(1)
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5, 6, 7])
    expect(errors[0].problems).toContain('type must be one of mc, typed, true_false, closest_number')
    expect(errors[1].problems).toContain('mc needs 2 to 6 options')
    expect(errors[2].problems).toEqual(expect.arrayContaining(['theme is required', 'prompt is required']))
    expect(errors[3].problems).toContain('number must be a number')
    expect(errors[4].problems).toContain('audio questions need a caption')
  })

  it('reports a missing column once, at the header', () => {
    expect(parseQuestionsCsv('theme,type\nx,mc').errors).toEqual([{ line: 1, problems: [expect.stringContaining('missing columns')] }])
  })
})

describe('importQuestions', () => {
  const fakeFetch = async (url: string) =>
    url.endsWith('missing.jpg')
      ? new Response('nope', { status: 404 })
      : new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } })

  it('stores questions and answers, creating the theme, with media under random names', async () => {
    const { rows } = parseQuestionsCsv(csv('reef-night,typed,Who lives in an anemone?,,,clownfish,,image,https://example.com/clownfish.jpg,,,1,'))
    const result = await importQuestions(db, rows, { mediaDir, fetch: fakeFetch })

    expect(result).toEqual({ imported: 1 })
    const [question] = db.select().from(t.questions).all()
    expect(question.mediaUrl).toMatch(/^\/media\/[0-9a-f-]{36}\.jpg$/)
    expect(question.mediaUrl).not.toContain('clownfish')
    expect(existsSync(join(mediaDir, basename(question.mediaUrl!)))).toBe(true)
    expect([...readFileSync(join(mediaDir, basename(question.mediaUrl!)))]).toEqual([1, 2, 3])
    expect(db.select().from(t.questionAnswers).where(eq(t.questionAnswers.questionId, question.id)).get()).toMatchObject({ acceptedAnswers: ['clownfish'] })
    expect(db.select().from(t.themes).all()).toMatchObject([{ slug: 'reef-night', name: 'Reef Night' }])
  })

  it('imports nothing when a download fails', async () => {
    const { rows } = parseQuestionsCsv(
      csv('reef-night,typed,First,,,a,,none,,,,,', 'reef-night,typed,Second,,,b,,image,https://example.com/missing.jpg,,,,'),
    )
    await expect(importQuestions(db, rows, { mediaDir, fetch: fakeFetch })).rejects.toThrow('line 3: could not download https://example.com/missing.jpg (404)')
    expect(db.select().from(t.questions).all()).toEqual([])
  })
})
