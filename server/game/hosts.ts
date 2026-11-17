// Per-round hosts: Rocco, Pebble and Dr. June take turns. Each round stores a host choice
// (random by default) and, once picked, its resolved host. The server picks once and stores it,
// so a reconnect never re-rolls it, and a random pick is never the previous round's host.
// Staff and the host can change a round's host until its first question opens.
//
// When a round's host is picked:
// - opening a question picks for that question's round (round 1, or a round reached directly);
// - moving to round_break picks for the next round with questions, so the break can introduce it;
// - entering final_wager picks for the wager round (normally already picked at the break).
import { and, desc, eq, isNotNull, lt } from 'drizzle-orm'
import { HOSTS, type Host, type HostChoice } from '../../shared/characters'
import type { GamePhase } from '../../shared/enums'
import type { Cast, PublicGameState, RoundHost } from '../../shared/game'
import type { Db } from '../db/client'
import { eventQuestions, gameState, rounds } from '../db/schema'
import { broadcastState, fail, ok, type GameContext, type GameResult } from './context'
import { loadEventPlan, type EventPlan } from './plan'

/** Rocco is the main host: he has the lobby, the end, and any round whose host was never picked. */
const MAIN_HOST: Host = 'rocco'

/** A fixed choice as is; random picks uniformly from the hosts other than `previous`. */
export function pickHost(choice: HostChoice, previous: Host | null, rng: () => number = Math.random): Host {
  if (choice !== 'random') return choice
  const pool = HOSTS.filter((host) => host !== previous)
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}

/**
 * The host of the closest earlier round that has one. Usually round position - 1; a round with
 * no questions is never played, so it never gets a host and the one before it counts instead.
 */
function previousHost(db: Db, round: { eventId: string; position: number }): Host | null {
  return (
    db
      .select({ host: rounds.host })
      .from(rounds)
      .where(and(eq(rounds.eventId, round.eventId), lt(rounds.position, round.position), isNotNull(rounds.host)))
      .orderBy(desc(rounds.position))
      .get()?.host ?? null
  )
}

/** The round's stored host, or picks one now, stores it and returns it. */
export function ensureRoundHost(db: Db, roundId: string, rng: () => number = Math.random): Host {
  const round = db.select().from(rounds).where(eq(rounds.id, roundId)).get()
  if (!round) throw new Error(`no round ${roundId}`)
  if (round.host) return round.host
  const host = pickHost(round.hostChoice, previousHost(db, round), rng)
  db.update(rounds).set({ host }).where(eq(rounds.id, roundId)).run()
  return host
}

/** The round an event question belongs to. */
export function roundOfQuestion(db: Db, eventQuestionId: string): string | null {
  return db.select({ roundId: eventQuestions.roundId }).from(eventQuestions).where(eq(eventQuestions.id, eventQuestionId)).get()?.roundId ?? null
}

function roundIndexOf(plan: EventPlan, eventQuestionId: string | null): number {
  return eventQuestionId ? plan.rounds.findIndex((r) => r.questions.some((q) => q.id === eventQuestionId)) : -1
}

/** The next round that will be played after the one at `index`: the next one with questions. */
function followingRound(plan: EventPlan, index: number) {
  return plan.rounds.slice(index + 1).find((r) => r.questions.length > 0) ?? null
}

/** On the move to round_break: picks the incoming round's host, so the break can introduce them. */
export function ensureIncomingHost(db: Db, eventId: string, currentEventQuestionId: string | null) {
  const plan = loadEventPlan(db, eventId)
  const incoming = followingRound(plan, roundIndexOf(plan, currentEventQuestionId))
  if (incoming) ensureRoundHost(db, incoming.id)
}

/** The phase whose cast is shown: a paused game keeps the cast of the phase it paused from. */
function shownPhase(state: { phase: PublicGameState['phase']; paused_from_phase: GamePhase | null }): GamePhase {
  return state.phase === 'paused' ? (state.paused_from_phase ?? 'lobby') : state.phase
}

/** GameView.cast: who is on stage for this game state. */
export function castOf(db: Db, eventId: string, state: PublicGameState): Cast {
  const phase = shownPhase(state)
  if (phase === 'lobby' || phase === 'ended') return { host: MAIN_HOST, incoming_host: null }
  const plan = loadEventPlan(db, eventId)
  const index = roundIndexOf(plan, state.current_event_question_id)
  const hostOf = (roundId: string | undefined) =>
    roundId ? (db.select({ host: rounds.host }).from(rounds).where(eq(rounds.id, roundId)).get()?.host ?? null) : null
  // A round whose host was never stored (a game already running when hosts shipped) gets Rocco.
  const host = hostOf(plan.rounds[index]?.id) ?? MAIN_HOST
  // A host who keeps the stage (a fixed choice can repeat) isn't handed over to.
  const takingOver = (incoming: Host | null, outgoing: Host | null) => (incoming && incoming !== outgoing ? incoming : null)
  if (phase === 'round_break') return { host, incoming_host: takingOver(hostOf(followingRound(plan, index)?.id), host) }
  if (phase === 'final_wager') {
    // The wager opens the final round, so its host is also the one taking over from the last
    // round played before it, unless no round came before it (no one to take over from).
    const before = plan.rounds
      .slice(0, Math.max(index, 0))
      .filter((r) => r.questions.length > 0)
      .at(-1)
    return { host, incoming_host: before ? takingOver(host, hostOf(before.id) ?? MAIN_HOST) : null }
  }
  return { host, incoming_host: null }
}

/**
 * Which round positions have started: every round up to the current question's round. Not in
 * the lobby; in round_break the current question is the finished round's last, so the next
 * round is still open to change. final_wager counts as the wager round started (its host is
 * already on screen asking for wagers). A paused game counts as the phase it paused from.
 */
function startedUpTo(db: Db, eventId: string): number {
  const row = db.select().from(gameState).where(eq(gameState.eventId, eventId)).get()
  if (!row) return 0
  if (row.phase === 'ended') return Number.POSITIVE_INFINITY
  const phase = shownPhase({ phase: row.phase, paused_from_phase: row.pausedFromPhase })
  if (phase === 'lobby' || !row.currentEventQuestionId) return 0
  const position = db
    .select({ position: rounds.position })
    .from(eventQuestions)
    .innerJoin(rounds, eq(rounds.id, eventQuestions.roundId))
    .where(eq(eventQuestions.id, row.currentEventQuestionId))
    .get()?.position
  return position ?? 0
}

/** set_round_host: change a round's host choice until its first question opens. */
export function setRoundHost(
  ctx: GameContext,
  { eventId, roundId, hostChoice }: { eventId: string; roundId: string; hostChoice: HostChoice },
): GameResult<{ host_choice: HostChoice; host: Host | null }> {
  const { db } = ctx
  const round = db.select().from(rounds).where(and(eq(rounds.id, roundId), eq(rounds.eventId, eventId))).get()
  if (!round) return fail('not_found')
  if (round.position <= startedUpTo(db, eventId)) return fail('round_started')
  if (round.host === null) {
    // Not reached yet: the host is picked from this choice when the round comes up.
    db.update(rounds).set({ hostChoice }).where(eq(rounds.id, roundId)).run()
    return ok({ host_choice: hostChoice, host: null })
  }
  // Already picked: this is the incoming round of a break, on screen now. Re-pick and tell everyone.
  const host = pickHost(hostChoice, previousHost(db, round))
  db.update(rounds).set({ hostChoice, host }).where(eq(rounds.id, roundId)).run()
  broadcastState(ctx, eventId)
  return ok({ host_choice: hostChoice, host })
}

/** round_hosts: every round of the event, for the staff "Round hosts" control. */
export function roundHosts(db: Db, eventId: string): RoundHost[] {
  const startedTo = startedUpTo(db, eventId)
  return db
    .select()
    .from(rounds)
    .where(eq(rounds.eventId, eventId))
    .orderBy(rounds.position)
    .all()
    .map((r) => ({ round_id: r.id, position: r.position, title: r.title, host_choice: r.hostChoice, host: r.host, started: r.position <= startedTo }))
}
