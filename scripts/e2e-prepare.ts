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
const { and, eq } = await import('drizzle-orm')
const { eventQuestions, events, questions, rounds } = await import('../server/db/schema')

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
  // Screen captures for the redesign (join.spec.ts): the normal join flow, then the stress cases.
  { joinCode: 'E2ES1' },
  { joinCode: 'E2ET1' },
  { joinCode: 'E2EU1', settings: { max_team_size: 8 } },
  // The answer sheet (Task 8, questions.spec and play-three.spec): E2E8A has a 6 s first question for the
  // nudge, E2E8B a long question and long options for the stress capture, E2E8C is for the round break and wager.
  { joinCode: 'E2E8A' },
  { joinCode: 'E2E8B' },
  { joinCode: 'E2E8C' },
  // The big screen at 1920x1080 (host.spec.ts, Task 10).
  { joinCode: 'E2E10' },
  { joinCode: 'E2E11' },
  // Round hosts (round-hosts.spec.ts): staff control, host console select, and a started round.
  { joinCode: 'E11A1' },
  { joinCode: 'E11B1' },
  { joinCode: 'E11C1' },
]

const db = openDb(DB_FILE)
applyMigrations(db)
for (const event of EVENTS) seedDemo(db, { mediaDir: join(env.DATA_DIR, 'media'), ...event })

/** The first question of round 1 of an event: the one the answer-sheet specs open first. */
function firstQuestion(joinCode: string) {
  const event = db.select({ id: events.id }).from(events).where(eq(events.joinCode, joinCode)).get()!
  const round = db.select({ id: rounds.id }).from(rounds).where(and(eq(rounds.eventId, event.id), eq(rounds.position, 1))).get()!
  return db.select().from(eventQuestions).where(and(eq(eventQuestions.roundId, round.id), eq(eventQuestions.position, 1))).get()!
}

// E2E8A: a 6 s question, so the 5 s nudge shows within a second of opening it.
const short = firstQuestion('E2E8A')
db.update(eventQuestions).set({ durationS: 6 }).where(eq(eventQuestions.id, short.id)).run()

// E2E8B: the longest wording the sheet must hold (kit stress case): a long prompt and long answers.
const stress = firstQuestion('E2E8B')
db.update(questions)
  .set({
    prompt: "Snapping shrimp make a crackling loud enough to confuse a submarine's sonar. When one snaps its oversized claw shut, what actually makes the sound you hear?",
    options: [
      'A collapsing bubble shot out from the snapping claw',
      'The two halves of its shell knocking against each other',
      'Its walking legs rubbing together very, very quickly',
      'Tiny teeth grinding away inside its stomach',
    ],
  })
  .where(eq(questions.id, stress.questionId))
  .run()
db.$client.close()
console.log(`e2e database ready: ${EVENTS.map((e) => e.joinCode).join(', ')}`)
