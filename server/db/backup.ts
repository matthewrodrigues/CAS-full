import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { env } from '../env'
import { DB_FILE, openDb } from './client'

const backupDir = join(env.DATA_DIR, 'backups')
mkdirSync(backupDir, { recursive: true })
const target = join(backupDir, `app-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)

const db = openDb(DB_FILE)
// VACUUM INTO writes a consistent copy and is safe while the server is running.
db.$client.prepare('VACUUM INTO ?').run(target)
db.$client.close()

console.log(`Backed up ${DB_FILE} to ${target}`)
