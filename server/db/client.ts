import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { env } from '../env'
import * as schema from './schema'

export const DB_FILE = join(env.DATA_DIR, 'app.db')

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
