import { applyMigrations, DB_FILE, openDb } from './client'

const db = openDb(DB_FILE)
applyMigrations(db)
db.$client.close()

console.log(`Migrations applied to ${DB_FILE}`)
