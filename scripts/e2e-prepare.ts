// Gives every `npm run e2e` a fresh database: deletes DATA_DIR, migrates, and seeds DEMO1 plus
// one event per spec file, so spec files never share game state and can run in parallel.
// Refuses any DATA_DIR that isn't an e2e folder, so it can never wipe data/app.db.
import { rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { env } from '../server/env'

if (basename(env.DATA_DIR) !== 'e2e') {
  console.error(`e2e-prepare only resets an e2e data folder; DATA_DIR is ${env.DATA_DIR}`)
  process.exit(1)
}
rmSync(env.DATA_DIR, { recursive: true, force: true })

// Imported after the reset so the database file is created fresh.
const { applyMigrations, DB_FILE, openDb } = await import('../server/db/client')
const { seedDemo } = await import('../server/db/seed-demo')

/** Join codes the e2e specs use (tests/e2e/support.ts mirrors this list). */
const EVENTS = [
  { joinCode: 'DEMO1' },
  { joinCode: 'E2EA1' },
  { joinCode: 'E2EB1' },
  { joinCode: 'E2EC1' },
  { joinCode: 'E2ED1' },
  { joinCode: 'E2EF1', settings: { team_submissions: 'captain_only' as const } },
  { joinCode: 'E2EG1' },
  { joinCode: 'E2EH1' },
]

const db = openDb(DB_FILE)
applyMigrations(db)
for (const event of EVENTS) seedDemo(db, { mediaDir: join(env.DATA_DIR, 'media'), ...event })
db.$client.close()
console.log(`e2e database ready: ${EVENTS.map((e) => e.joinCode).join(', ')}`)
