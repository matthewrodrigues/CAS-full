import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { DB_FILE, openDb } from './client'

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url))
const db = openDb(DB_FILE)

if (existsSync(join(migrationsFolder, 'meta', '_journal.json'))) {
  migrate(db, { migrationsFolder })
  console.log(`Migrations applied to ${DB_FILE}`)
} else {
  console.log(`Database ready at ${DB_FILE}. No migrations to apply yet.`)
}

db.$client.close()
