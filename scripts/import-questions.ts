// npm run import-questions -- <file.csv> [--check]
// Validates every row and reports problems by line; imports nothing unless every row is valid.
// Columns: see COLUMNS in server/db/import-questions.ts (one header row).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DB_FILE, openDb } from '../server/db/client'
import { importQuestions, parseQuestionsCsv } from '../server/db/import-questions'
import { env } from '../server/env'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
if (!file) {
  console.error('Usage: npm run import-questions -- <file.csv> [--check]')
  process.exit(2)
}

const { rows, errors } = parseQuestionsCsv(readFileSync(file, 'utf8'))
for (const { line, problems } of errors) console.error(`line ${line}: ${problems.join('; ')}`)
if (errors.length) {
  console.error(`${errors.length} row(s) have problems; nothing was imported.`)
  process.exit(1)
}
if (args.includes('--check')) {
  console.log(`${rows.length} row(s) are valid (--check: nothing imported).`)
  process.exit(0)
}

const db = openDb(DB_FILE)
try {
  const { imported } = await importQuestions(db, rows, { mediaDir: join(env.DATA_DIR, 'media') })
  console.log(`Imported ${imported} question(s).`)
} catch (error) {
  console.error((error as Error).message, '\nNothing was imported.')
  process.exitCode = 1
} finally {
  db.$client.close()
}
