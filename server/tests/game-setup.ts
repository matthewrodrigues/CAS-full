// Shared setup for engine tests: seeded DEMO1, a real game context, and recording sockets.
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import type { ServerMessage } from '../../shared/messages'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import type { GameContext } from '../game/context'
import { lock, next, reveal } from '../game/flow'
import { createTeam } from '../game/teams'
import { createTimers } from '../game/timers'
import { createRealtime } from '../realtime/rooms'
import { makeTestDb } from './helpers'

export function makeGame(db: Db = makeTestDb()) {
  const mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-game-'))
  const { eventId } = seedDemo(db, { mediaDir })
  const ctx: GameContext = { db, realtime: createRealtime(), timers: createTimers() }
  return { db, ctx, eventId, cleanup: () => (ctx.timers.disarmAll(), rmSync(mediaDir, { recursive: true, force: true })) }
}

/** A socket that records what the server sends it. */
export function listen(ctx: GameContext, member: { eventId: string; playerId?: string | null; teamId?: string | null; isHost?: boolean }) {
  const received: ServerMessage[] = []
  ctx.realtime.add(
    { send: (data) => void received.push(JSON.parse(data)) },
    { playerId: null, teamId: null, isHost: false, ...member },
  )
  return received
}

export function state(db: Db, eventId: string) {
  return db.select().from(t.gameState).where(eq(t.gameState.eventId, eventId)).get()!
}

/** A player on a new team; returns their ids. */
export function teamWithPlayer(ctx: GameContext, eventId: string, name: string, extraTimeS = 0) {
  const playerId = randomUUID()
  ctx.db.insert(t.players).values({ id: playerId, nickname: `${name} captain`, extraTimeS }).run()
  const team = createTeam(ctx, { eventId, playerId, name })
  if (!team.ok) throw new Error(team.error)
  return { playerId, teamId: team.value.id }
}

/** Plays the host's obvious next action until the game reaches `phase`. */
export function advanceUntil(ctx: GameContext, eventId: string, phase: string) {
  for (let i = 0; i < 200; i++) {
    const current = state(ctx.db, eventId).phase
    if (current === phase) return
    const step = ['live', 'final_live'].includes(current)
      ? lock(ctx, eventId)
      : ['locked', 'final_locked'].includes(current)
        ? reveal(ctx, eventId)
        : next(ctx, eventId)
    if (!step.ok) throw new Error(`${current}: ${step.error}`)
  }
  throw new Error(`never reached ${phase}`)
}
