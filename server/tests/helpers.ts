import { applyMigrations, openDb, type Db } from '../db/client'

/** In-memory SQLite with the real generated migrations applied. */
export function makeTestDb(): Db {
  const db = openDb(':memory:')
  applyMigrations(db)
  return db
}
