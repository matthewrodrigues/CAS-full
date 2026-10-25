import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { env } from '../env'
import * as schema from './schema'

export const DB_FILE = join(env.DATA_DIR, 'app.db')

const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url))

export type Db = ReturnType<typeof openDb>

/** Opens SQLite with the pragmas CLAUDE.md requires. Tests pass ':memory:'. */
export function openDb(file: string) {
  const inMemory = file === ':memory:'
  if (!inMemory) mkdirSync(dirname(file), { recursive: true })

  const sqlite = new Database(file)
  if (!inMemory) sqlite.pragma('journal_mode = WAL')
  // SQLite ignores foreign keys unless every connection turns them on.
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')

  return drizzle({ client: sqlite, schema })
}

/** Applies the generated migrations in server/db/migrations (tests run them on ':memory:'). */
export function applyMigrations(db: Db) {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
}
