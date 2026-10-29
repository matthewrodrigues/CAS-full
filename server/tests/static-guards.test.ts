// Source guards for the security rules a request-level test can't see (docs/SPEC.md section 6):
// rule 2 (only scoring and the reveal builder touch question_answers), rule 6 (no secrets reach
// the client bundle) and rule 10 (parameterized SQL only). Like src/styles/no-raw-colors.test.ts,
// each guard reports file:line and has samples proving it catches what it should.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const toRepoPath = (file: string) => relative(ROOT, file).split(sep).join('/')

/** Source files under the given repo folders, minus tests and generated migrations. */
function sourceFiles(...dirs: string[]): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return ['node_modules', 'tests', 'migrations'].includes(entry.name) ? [] : walk(path)
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
    })
  return dirs.map((d) => join(ROOT, d)).filter(existsSync).flatMap(walk)
}

/** Runs a line matcher over files and returns `path:line match` for each hit. */
function scan(files: string[], find: (text: string, file: string) => { line: number; match: string }[]) {
  return files.flatMap((file) => find(readFileSync(file, 'utf8'), file).map((v) => `${toRepoPath(file)}:${v.line} ${v.match}`))
}

function matchLines(text: string, pattern: RegExp) {
  return text.split('\n').flatMap((line, i) => {
    const match = line.match(pattern)
    return match ? [{ line: i + 1, match: match[0] }] : []
  })
}

// Rule 2 ---------------------------------------------------------------------------------------

/** Blanks out comments (keeping line numbers) so prose about the table isn't a reference. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const findAnswerTableRefs = (text: string) => matchLines(stripComments(text), /\bquestionAnswers\b|\bquestion_answers\b/)

// The reveal-payload builder reads answers; Milestone 2 adds scoring, Milestone 5 scripts/import-questions.ts.
const ANSWER_TABLE_ALLOWED = new Set(['server/db/schema.ts', 'server/db/seed-demo.ts', 'server/game/reveal.ts', 'server/game/scoring.ts', 'server/db/import-questions.ts'])

// Rule 6 ---------------------------------------------------------------------------------------

const IMPORT = /^\s*(import|export)\s+(type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm
const DYNAMIC_IMPORT = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g

function resolvesIntoServer(specifier: string, file: string): boolean {
  const target = specifier.startsWith('@/')
    ? resolve(ROOT, 'src', specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(file), specifier)
      : null
  return target !== null && (toRepoPath(target) + '/').startsWith('server/')
}

/** Imports in client code that would pull server modules (and their secrets) into the bundle. */
function findServerRuntimeImports(text: string, file: string) {
  const hits: { line: number; match: string }[] = []
  const lineOf = (index: number) => text.slice(0, index).split('\n').length
  for (const m of text.matchAll(IMPORT)) {
    if (!m[2] && resolvesIntoServer(m[3], file)) hits.push({ line: lineOf(m.index), match: m[0].trim() })
  }
  for (const m of text.matchAll(DYNAMIC_IMPORT)) {
    if (resolvesIntoServer(m[1], file)) hits.push({ line: lineOf(m.index), match: m[0] })
  }
  return hits
}

const findViteEnv = (text: string) => matchLines(text, /\bimport\.meta\.env\.VITE_\w*|^\s*VITE_\w*\s*=/)

// Rule 10 --------------------------------------------------------------------------------------

/** String-built SQL: sql.raw, or a raw-driver call fed a template literal with interpolation. */
function findRawSql(text: string) {
  const hits = [...text.matchAll(/\bsql\.raw\(|\.(?:prepare|exec|run)\(\s*`[^`]*\$\{/g)]
  return hits.map((m) => ({ line: text.slice(0, m.index).split('\n').length, match: m[0].split('\n')[0] }))
}

const RAW_SQL_ALLOWED = new Set(['server/db/schema.ts'])

// ---------------------------------------------------------------------------------------------

describe('question_answers isolation (rule 2)', () => {
  it('is referenced only by allowed files', () => {
    const violations = scan(sourceFiles('server', 'shared', 'scripts', 'src'), findAnswerTableRefs).filter(
      (v) => !ANSWER_TABLE_ALLOWED.has(v.split(':')[0]),
    )
    expect(violations).toEqual([])
  })

  it.each(['db.select().from(questionAnswers)', "db.$client.prepare('select * from question_answers')"])('catches %s', (sample) => {
    expect(findAnswerTableRefs(sample)).not.toEqual([])
  })

  it.each(['// question_answers is never sent', '/* reads questionAnswers */ const x = 1', 'db.select().from(questions)'])(
    'allows %s',
    (sample) => {
      expect(findAnswerTableRefs(sample)).toEqual([])
    },
  )
})

describe('client bundle (rule 6)', () => {
  it('never imports server runtime code', () => {
    expect(scan(sourceFiles('src'), findServerRuntimeImports)).toEqual([])
  })

  it('reads no VITE_ env vars', () => {
    expect(scan(sourceFiles('src'), findViteEnv)).toEqual([])
    expect(findViteEnv(readFileSync(join(ROOT, '.env.example'), 'utf8'))).toEqual([])
  })

  const clientFile = join(ROOT, 'src', 'lib', 'api.ts')

  it.each([
    "import { createApp } from '../../server/app'",
    "import { env } from '@/../server/env'",
    "import '../../server/db/client'",
    "const m = await import('../../server/env')",
    "import { type AppType } from '../../server/app'",
  ])('catches %s', (sample) => {
    expect(findServerRuntimeImports(sample, clientFile)).not.toEqual([])
  })

  it.each(["import type { AppType } from '../../server/app'", "import { Hono } from 'hono'", "import { cn } from '@/lib/utils'"])(
    'allows %s',
    (sample) => {
      expect(findServerRuntimeImports(sample, clientFile)).toEqual([])
    },
  )

  it.each(['const key = import.meta.env.VITE_API_KEY', 'VITE_SECRET=abc'])('catches %s', (sample) => {
    expect(findViteEnv(sample)).not.toEqual([])
  })

  it('allows import.meta.env.DEV', () => {
    expect(findViteEnv('if (import.meta.env.DEV) console.log(1)')).toEqual([])
  })
})

describe('parameterized SQL (rule 10)', () => {
  it('has no string-built SQL', () => {
    const violations = scan(sourceFiles('server', 'scripts'), findRawSql).filter((v) => !RAW_SQL_ALLOWED.has(v.split(':')[0]))
    expect(violations).toEqual([])
  })

  it.each(['db.$client.exec(`select ${x}`)', 'sql.raw(userInput)', 'db.$client.prepare(`update t\nset c = ${v}`)'])('catches %s', (sample) => {
    expect(findRawSql(sample)).not.toEqual([])
  })

  it.each(["db.$client.prepare('VACUUM INTO ?').run(target)", 'db.get(sql`select ${x}`)', 'db.insert(t).values(v).run()'])(
    'allows %s',
    (sample) => {
      expect(findRawSql(sample)).toEqual([])
    },
  )
})

// Schema migrations --------------------------------------------------------------------------

/**
 * A drizzle-kit table rebuild: it emits PRAGMA foreign_keys=OFF inside the migration's
 * transaction, where SQLite ignores it, so the DROP TABLE would cascade-delete child rows.
 */
const findTableRebuild = (text: string) => matchLines(text, /PRAGMA\s+foreign_keys\s*=\s*OFF|`?__new_\w+/i)

describe('migrations', () => {
  it('never rebuild a table', () => {
    const dir = join(ROOT, 'server', 'db', 'migrations')
    const files = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .map((name) => join(dir, name))
    expect(files.length).toBeGreaterThan(0)
    expect(scan(files, findTableRebuild)).toEqual([])
  })

  it.each(['PRAGMA foreign_keys=OFF;--> statement-breakpoint', 'CREATE TABLE `__new_submissions` (', 'pragma foreign_keys = off'])(
    'catches %s',
    (sample) => {
      expect(findTableRebuild(sample)).not.toEqual([])
    },
  )

  it.each(['ALTER TABLE `event_questions` ADD `revealed_at` integer;', 'PRAGMA foreign_keys=ON;'])('allows %s', (sample) => {
    expect(findTableRebuild(sample)).toEqual([])
  })
})
