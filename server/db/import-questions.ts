// The question import (docs/SPEC.md sections 2 and 8, Milestone 5): a Google Sheet exported to
// CSV becomes questions plus question_answers. Every row is validated and errors are reported by
// line; one bad row imports nothing. Media is downloaded into DATA_DIR/media under a random name,
// because a name like giant-squid.jpg would give the answer away.
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import Papa from 'papaparse'
import { MEDIA_KINDS, QUESTION_TYPES, type MediaKind, type QuestionType } from '../../shared/enums'
import { validateQuestion } from '../game/content-rules'
import type { Db } from './client'
import { questionAnswers, questions, themes } from './schema'

export const COLUMNS = ['theme', 'type', 'prompt', 'options', 'correct', 'accepted', 'number', 'media', 'media_url', 'caption', 'fun_fact', 'difficulty', 'author'] as const
type Column = (typeof COLUMNS)[number]

export type ParsedQuestion = {
  line: number
  theme: string
  question: {
    type: QuestionType
    prompt: string
    options: string[] | null
    mediaKind: MediaKind
    mediaUrl: string | null
    caption: string | null
    funFact: string | null
    difficulty: number | null
    author: string | null
  }
  answer: { acceptedAnswers: string[]; correctOption: number | null; numericAnswer: number | null }
}
export type RowError = { line: number; problems: string[] }

const list = (value: string) =>
  value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
const orNull = (value: string) => (value.trim() === '' ? null : value.trim())

/** The correct option as a letter (A–F), its text, or for true/false the word true or false. */
function correctOption(type: QuestionType, value: string, options: string[] | null): number | null {
  const v = value.trim()
  if (v === '') return null
  if (type === 'true_false') return /^true$/i.test(v) ? 0 : /^false$/i.test(v) ? 1 : NaN
  if (/^[A-F]$/i.test(v)) return v.toUpperCase().charCodeAt(0) - 65
  const index = options?.findIndex((o) => o.toLowerCase() === v.toLowerCase()) ?? -1
  return index >= 0 ? index : NaN
}

export function parseQuestionsCsv(text: string): { rows: ParsedQuestion[]; errors: RowError[] } {
  const parsed = Papa.parse<Record<Column, string>>(text.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() })
  const missing = COLUMNS.filter((c) => !parsed.meta.fields?.includes(c))
  if (missing.length) return { rows: [], errors: [{ line: 1, problems: [`missing columns: ${missing.join(', ')}`] }] }

  const rows: ParsedQuestion[] = []
  const errors: RowError[] = []
  parsed.data.forEach((raw, i) => {
    const line = i + 2 // the header is line 1
    const problems: string[] = []
    const get = (c: Column) => (raw[c] ?? '').trim()
    const type = get('type') as QuestionType
    const mediaKind = (get('media') || 'none') as MediaKind
    if (!get('theme')) problems.push('theme is required')
    if (!get('prompt')) problems.push('prompt is required')
    if (!QUESTION_TYPES.includes(type)) problems.push(`type must be one of ${QUESTION_TYPES.join(', ')}`)
    if (!MEDIA_KINDS.includes(mediaKind)) problems.push(`media must be one of ${MEDIA_KINDS.join(', ')}`)
    const number = get('number') === '' ? null : Number(get('number').replace(/,/g, ''))
    if (number !== null && !Number.isFinite(number)) problems.push('number must be a number')
    const difficulty = get('difficulty') === '' ? null : Number(get('difficulty'))
    if (difficulty !== null && !(Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 3)) problems.push('difficulty must be 1, 2 or 3')
    const mediaUrl = orNull(get('media_url'))
    if (mediaUrl && !/^https?:\/\//.test(mediaUrl)) problems.push('media_url must be an http(s) URL')

    if (problems.length === 0) {
      const options = type === 'mc' ? list(get('options')) : get('options') ? list(get('options')) : null
      const correct = correctOption(type, get('correct'), options)
      if (Number.isNaN(correct)) problems.push('correct must be a letter A–F, the text of an option, or true/false')
      const question = { type, prompt: get('prompt'), options, mediaKind, mediaUrl, caption: orNull(get('caption')), funFact: orNull(get('fun_fact')), difficulty, author: orNull(get('author')) }
      const answer = { acceptedAnswers: list(get('accepted')), correctOption: Number.isNaN(correct) ? null : correct, numericAnswer: number }
      if (!Number.isNaN(correct)) problems.push(...validateQuestion(question, answer))
      if (problems.length === 0) rows.push({ line, theme: get('theme'), question, answer })
    }
    if (problems.length) errors.push({ line, problems })
  })
  return { rows, errors }
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' }

function extension(contentType: string | null, url: string): string {
  const type = contentType?.split(';')[0].trim().toLowerCase() ?? ''
  return EXTENSIONS[type] ?? url.match(/\.([a-z0-9]{2,4})(?:\?|$)/i)?.[1]?.toLowerCase() ?? 'bin'
}

const titleCase = (slug: string) => slug.split(/[-_ ]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** Downloads every file first, then writes all rows in one transaction. */
export async function importQuestions(
  db: Db,
  rows: ParsedQuestion[],
  { mediaDir, fetch: fetchImpl = fetch }: { mediaDir: string; fetch?: (url: string) => Promise<Response> },
): Promise<{ imported: number }> {
  mkdirSync(mediaDir, { recursive: true })
  const mediaUrls = new Map<number, string>()
  for (const row of rows) {
    if (!row.question.mediaUrl) continue
    const response = await fetchImpl(row.question.mediaUrl).catch(() => null)
    if (!response?.ok) throw new Error(`line ${row.line}: could not download ${row.question.mediaUrl} (${response?.status ?? 'network error'})`)
    const name = `${randomUUID()}.${extension(response.headers.get('content-type'), row.question.mediaUrl)}`
    writeFileSync(join(mediaDir, name), Buffer.from(await response.arrayBuffer()))
    mediaUrls.set(row.line, `/media/${name}`)
  }

  db.transaction((tx) => {
    const themeIds = new Map<string, string>()
    for (const row of rows) {
      let themeId = themeIds.get(row.theme) ?? tx.select({ id: themes.id }).from(themes).where(eq(themes.slug, row.theme)).get()?.id
      if (!themeId) {
        themeId = randomUUID()
        tx.insert(themes).values({ id: themeId, slug: row.theme, name: titleCase(row.theme), accentToken: 'depth' }).run()
      }
      themeIds.set(row.theme, themeId)
      const id = randomUUID()
      tx.insert(questions).values({ id, themeId, ...row.question, mediaUrl: mediaUrls.get(row.line) ?? null }).run()
      tx.insert(questionAnswers).values({ questionId: id, ...row.answer }).run()
    }
  })
  return { imported: rows.length }
}
