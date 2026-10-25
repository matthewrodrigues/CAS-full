import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseSettings } from '../../shared/settings'
import type { Db } from '../db/client'
import { eventLeaderboard, seasonLeaderboard } from '../db/queries'
import * as t from '../db/schema'
import { makeTestDb } from './helpers'

// Season 1, night 1: Alpha 30 (Ana, Ben), Bravo 30 − 10 adjust = 20 (Cy), Charlie 20 (Dee), Delta 0 (Eli).
// Season 1, night 2: Echo 15 (Ana switched teams, with Cy).
// Season 2: Foxtrot 100 (Dee), which must not count toward season 1.
let db: Db
let ids: Record<string, string>

beforeEach(() => {
  db = makeTestDb()
  ids = {}
  const id = (key: string) => (ids[key] ??= randomUUID())

  db.insert(t.themes).values({ id: id('theme'), name: 'Theme', slug: 'theme', accentToken: 'depth' }).run()
  for (const season of ['s1', 's2']) {
    db.insert(t.seasons).values({ id: id(season), name: season, startsOn: '2026-01-01', endsOn: '2026-12-31' }).run()
  }
  for (const [event, season, code] of [
    ['night1', 's1', 'NITE1'],
    ['night2', 's1', 'NITE2'],
    ['other', 's2', 'OTHR1'],
  ]) {
    db.insert(t.events)
      .values({ id: id(event), seasonId: id(season), themeId: id('theme'), startsAt: 0, joinCode: code, settings: parseSettings({}) })
      .run()
  }
  for (const nickname of ['Ana', 'Ben', 'Cy', 'Dee', 'Eli']) {
    db.insert(t.players).values({ id: id(nickname), nickname }).run()
  }

  const team = (name: string, event: string, members: string[], points: number[]) => {
    db.insert(t.teams).values({ id: id(name), eventId: id(event), name, nameStatus: 'approved' }).run()
    for (const m of members) db.insert(t.teamMembers).values({ teamId: id(name), eventId: id(event), playerId: id(m) }).run()
    for (const p of points) db.insert(t.scoreEvents).values({ teamId: id(name), points: p, reason: 'correct' }).run()
  }
  team('Alpha', 'night1', ['Ana', 'Ben'], [10, 10, 10])
  team('Bravo', 'night1', ['Cy'], [10, 10, 10])
  team('Charlie', 'night1', ['Dee'], [10, 10])
  team('Delta', 'night1', ['Eli'], [])
  team('Echo', 'night2', ['Ana', 'Cy'], [15])
  team('Foxtrot', 'other', ['Dee'], [100])
  db.insert(t.scoreEvents).values({ teamId: id('Bravo'), points: -10, reason: 'adjust', note: 'Phone use' }).run()
})

describe('eventLeaderboard', () => {
  it('totals each team, counts adjustments, and ranks ties together', () => {
    expect(eventLeaderboard(db, ids.night1)).toEqual([
      { teamId: ids.Alpha, name: 'Alpha', nameStatus: 'approved', points: 30, rank: 1 },
      { teamId: ids.Bravo, name: 'Bravo', nameStatus: 'approved', points: 20, rank: 2 },
      { teamId: ids.Charlie, name: 'Charlie', nameStatus: 'approved', points: 20, rank: 2 },
      { teamId: ids.Delta, name: 'Delta', nameStatus: 'approved', points: 0, rank: 4 },
    ])
  })

  it('only includes teams from that event', () => {
    expect(eventLeaderboard(db, ids.night2).map((r) => r.name)).toEqual(['Echo'])
  })

  it('is empty for an event with no teams', () => {
    expect(eventLeaderboard(db, randomUUID())).toEqual([])
  })
})

describe('seasonLeaderboard', () => {
  it("credits every member with the team's points across the season's nights", () => {
    expect(seasonLeaderboard(db, ids.s1)).toEqual([
      { playerId: ids.Ana, nickname: 'Ana', points: 45, rank: 1 },
      { playerId: ids.Cy, nickname: 'Cy', points: 35, rank: 2 },
      { playerId: ids.Ben, nickname: 'Ben', points: 30, rank: 3 },
      { playerId: ids.Dee, nickname: 'Dee', points: 20, rank: 4 },
      { playerId: ids.Eli, nickname: 'Eli', points: 0, rank: 5 },
    ])
  })

  it('excludes events from other seasons', () => {
    expect(seasonLeaderboard(db, ids.s2)).toEqual([{ playerId: ids.Dee, nickname: 'Dee', points: 100, rank: 1 }])
  })

  it("drops a deleted player but keeps their team's event total", () => {
    db.delete(t.players).where(eq(t.players.id, ids.Ben)).run()
    expect(seasonLeaderboard(db, ids.s1).map((r) => r.nickname)).toEqual(['Ana', 'Cy', 'Dee', 'Eli'])
    expect(eventLeaderboard(db, ids.night1)[0]).toMatchObject({ name: 'Alpha', points: 30 })
  })
})
