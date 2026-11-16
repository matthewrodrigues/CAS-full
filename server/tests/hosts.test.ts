// Per-round hosts: Rocco, Pebble and Dr. June take turns. A random host is picked once, never
// the previous round's, and can be changed until the round's first question opens.
import { asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HOSTS, type Host } from '../../shared/characters'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import type { GameContext } from '../game/context'
import { lock, next, pause, resume, reveal } from '../game/flow'
import { ensureRoundHost, pickHost, roundHosts, setRoundHost } from '../game/hosts'
import { getState } from '../game/state'
import { advanceUntil, listen, makeGame, state } from './game-setup'

const roundRows = (db: Db, eventId: string) =>
  db.select().from(t.rounds).where(eq(t.rounds.eventId, eventId)).orderBy(asc(t.rounds.position)).all()
const castOf = (ctx: GameContext, eventId: string) => getState(ctx, { eventId, playerId: null, isHost: false })!.cast

describe('pickHost', () => {
  it('pickHost returns a fixed choice as is', () => {
    for (const host of HOSTS) {
      expect(pickHost(host, null, Math.random)).toBe(host)
      // A fixed choice wins even over "not the same host twice": staff asked for it.
      expect(pickHost(host, host, Math.random)).toBe(host)
    }
  })

  it('pickHost random never repeats the previous host', () => {
    const seen = new Set<Host>()
    for (let i = 0; i < 200; i++) seen.add(pickHost('random', 'rocco', Math.random))
    expect(seen.has('rocco')).toBe(false)
    expect([...seen].sort()).toEqual(['june', 'pebble'])
  })

  it('pickHost random with no previous can pick any host', () => {
    expect(pickHost('random', null, () => 0)).toBe(HOSTS[0])
    expect(pickHost('random', null, () => 0.5)).toBe(HOSTS[1])
    expect(pickHost('random', null, () => 0.999999)).toBe(HOSTS[2])
  })
})

describe('in the game', () => {
  let db: Db
  let ctx: GameContext
  let eventId: string
  let cleanup: () => void

  beforeEach(() => {
    ;({ db, ctx, eventId, cleanup } = makeGame())
  })
  afterEach(() => cleanup())

  it('ensureRoundHost is stable across calls', () => {
    const [first] = roundRows(db, eventId)
    expect(first.host).toBeNull()
    const host = ensureRoundHost(db, first.id)
    // Whatever a second roll would give, the stored host stands.
    for (const rng of [() => 0, () => 0.5, () => 0.99]) expect(ensureRoundHost(db, first.id, rng)).toBe(host)
    expect(roundRows(db, eventId)[0].host).toBe(host)
  })

  it('ensureRoundHost never gives a round the previous round’s host', () => {
    const [first, second] = roundRows(db, eventId)
    db.update(t.rounds).set({ host: 'pebble' }).where(eq(t.rounds.id, first.id)).run()
    expect(ensureRoundHost(db, second.id, () => 0)).toBe('rocco')
    db.update(t.rounds).set({ host: null }).where(eq(t.rounds.id, second.id)).run()
    expect(ensureRoundHost(db, second.id, () => 0.99)).toBe('june')
  })

  it("opening round 1's first question resolves its host", () => {
    next(ctx, eventId)
    expect(state(db, eventId).phase).toBe('live')
    const host = roundRows(db, eventId)[0].host
    expect(host).not.toBeNull()
    expect(castOf(ctx, eventId)).toEqual({ host, incoming_host: null })
  })

  it("moving to round_break resolves the next round's host as incoming_host", () => {
    advanceUntil(ctx, eventId, 'round_break')
    const [first, second, third] = roundRows(db, eventId)
    expect(second.host).not.toBeNull()
    expect(second.host).not.toBe(first.host)
    expect(third.host).toBeNull()
    expect(castOf(ctx, eventId)).toEqual({ host: first.host, incoming_host: second.host })

    // The incoming host is who opens round 2, and a pause in between changes nothing.
    pause(ctx, eventId)
    expect(castOf(ctx, eventId)).toEqual({ host: first.host, incoming_host: second.host })
    resume(ctx, eventId)
    next(ctx, eventId)
    expect(castOf(ctx, eventId)).toEqual({ host: second.host, incoming_host: null })
  })

  it('the final wager is introduced by the final round’s host', () => {
    advanceUntil(ctx, eventId, 'final_wager')
    const rounds = roundRows(db, eventId)
    const wager = rounds.find((r) => r.format === 'wager')!
    const before = rounds.find((r) => r.position === wager.position - 1)!
    expect(wager.host).not.toBeNull()
    expect(wager.host).not.toBe(before.host)
    expect(castOf(ctx, eventId)).toEqual({ host: wager.host, incoming_host: wager.host })
    next(ctx, eventId)
    expect(castOf(ctx, eventId)).toEqual({ host: wager.host, incoming_host: null })
  })

  it('every round gets a host, and no two rounds in a row share one', () => {
    for (let game = 0; game < 10; game++) {
      cleanup()
      ;({ db, ctx, eventId, cleanup } = makeGame())
      advanceUntil(ctx, eventId, 'ended')
      const hosts = roundRows(db, eventId).map((r) => r.host)
      expect(hosts.every((h) => h !== null)).toBe(true)
      for (let i = 1; i < hosts.length; i++) expect(hosts[i]).not.toBe(hosts[i - 1])
    }
  })

  it('the lobby and the end are hosted by Rocco', () => {
    db.update(t.rounds).set({ hostChoice: 'june' }).run()
    expect(castOf(ctx, eventId)).toEqual({ host: 'rocco', incoming_host: null })
    advanceUntil(ctx, eventId, 'ended')
    expect(castOf(ctx, eventId)).toEqual({ host: 'rocco', incoming_host: null })
  })

  it('set_round_host updates the incoming host during the round break', () => {
    advanceUntil(ctx, eventId, 'round_break')
    const second = roundRows(db, eventId)[1]
    const choice: Host = second.host === 'june' ? 'pebble' : 'june'
    const messages = listen(ctx, { eventId })

    expect(setRoundHost(ctx, { eventId, roundId: second.id, hostChoice: choice })).toEqual({ ok: true, value: { host_choice: choice, host: choice } })
    expect(castOf(ctx, eventId).incoming_host).toBe(choice)
    expect(messages.filter((m) => m.type === 'state')).toHaveLength(1)

    // Back to random: a fresh pick, still never round 1's host.
    const first = roundRows(db, eventId)[0]
    const back = setRoundHost(ctx, { eventId, roundId: second.id, hostChoice: 'random' })
    expect(back.ok && back.value.host_choice).toBe('random')
    expect(back.ok && back.value.host).not.toBe(first.host)
    expect(back.ok && back.value.host).not.toBeNull()
  })

  it('set_round_host before a round is reached stores the choice and leaves the host to be picked', () => {
    const third = roundRows(db, eventId)[2]
    expect(setRoundHost(ctx, { eventId, roundId: third.id, hostChoice: 'pebble' })).toEqual({ ok: true, value: { host_choice: 'pebble', host: null } })
    next(ctx, eventId) // round 1 live: round 3 is still ahead
    expect(setRoundHost(ctx, { eventId, roundId: third.id, hostChoice: 'june' }).ok).toBe(true)
    advanceUntil(ctx, eventId, 'round_break')
    advanceUntil(ctx, eventId, 'live')
    advanceUntil(ctx, eventId, 'round_break') // after round 2
    expect(roundRows(db, eventId)[2].host).toBe('june')
    expect(castOf(ctx, eventId).incoming_host).toBe('june')
  })

  it('set_round_host refuses a round that has started, in every phase', () => {
    const [first, second] = roundRows(db, eventId)
    next(ctx, eventId)
    expect(setRoundHost(ctx, { eventId, roundId: first.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    lock(ctx, eventId)
    expect(setRoundHost(ctx, { eventId, roundId: first.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    reveal(ctx, eventId)
    pause(ctx, eventId)
    expect(setRoundHost(ctx, { eventId, roundId: first.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    resume(ctx, eventId)
    advanceUntil(ctx, eventId, 'round_break')
    expect(setRoundHost(ctx, { eventId, roundId: first.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    next(ctx, eventId)
    expect(setRoundHost(ctx, { eventId, roundId: second.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    advanceUntil(ctx, eventId, 'final_wager')
    const wager = roundRows(db, eventId).find((r) => r.format === 'wager')!
    expect(setRoundHost(ctx, { eventId, roundId: wager.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    advanceUntil(ctx, eventId, 'ended')
    expect(setRoundHost(ctx, { eventId, roundId: wager.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'round_started' })
    expect(roundRows(db, eventId).every((r) => r.hostChoice === 'random')).toBe(true)
  })

  it('set_round_host answers not_found for a round of another event', () => {
    const [first] = roundRows(db, eventId)
    expect(setRoundHost(ctx, { eventId: crypto.randomUUID(), roundId: first.id, hostChoice: 'june' })).toEqual({ ok: false, error: 'not_found' })
    expect(setRoundHost(ctx, { eventId, roundId: crypto.randomUUID(), hostChoice: 'june' })).toEqual({ ok: false, error: 'not_found' })
  })

  it('roundHosts lists every round with its choice, host and whether it has started', () => {
    advanceUntil(ctx, eventId, 'round_break')
    const rows = roundRows(db, eventId)
    expect(roundHosts(db, eventId)).toEqual(
      rows.map((r) => ({ round_id: r.id, position: r.position, title: r.title, host_choice: 'random', host: r.host, started: r.position === 1 })),
    )
  })
})
