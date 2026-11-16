// Animal naming prizes and the My Animal feed: naming rights by finishing place at `ended`,
// name proposals and staff approval, follows, updates and the staff prize list.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import { bodyOf, call, cookieFrom, makeTestApp, sessionFor } from './helpers'

let test: ReturnType<typeof makeTestApp>
let eventId: string
let mediaDir: string
let host: string
let staff: string

beforeEach(() => {
  test = makeTestApp()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-animals-'))
  eventId = seedDemo(test.db, { mediaDir }).eventId
  host = sessionFor(test.db, 'host')
  staff = sessionFor(test.db, 'staff')
})
afterEach(() => {
  test.game.stop()
  vi.useRealTimers()
  rmSync(mediaDir, { recursive: true, force: true })
})

const post = (path: string, token: string, body: unknown) => call(test.app, 'POST', path, { token, body })
const get = (path: string, token: string) => call(test.app, 'GET', path, { token })

async function player(nickname: string, team?: string) {
  const token = cookieFrom(await call(test.app, 'POST', '/api/join_event', { body: { join_code: 'DEMO1', nickname } }))!
  const teamId = team ? (await bodyOf(await post('/api/create_team', token, { event_id: eventId, name: team }))).id : null
  return { token, teamId }
}

async function endTheNight(score: Record<string, number>) {
  for (const [teamId, points] of Object.entries(score)) await post('/api/host_adjust_score', host, { team_id: teamId, points, note: 'Setup' })
  for (let i = 0; i < 200; i++) {
    const { state } = await bodyOf(await get(`/api/get_state?event_id=${eventId}`, host))
    if (state.phase === 'ended') return
    const op = ['live', 'locked', 'final_live', 'final_locked'].includes(state.phase) ? 'host_skip' : 'host_next'
    expect((await post(`/api/${op}`, host, { event_id: eventId })).status).toBe(200)
  }
  throw new Error('never ended')
}

const rightsOf = async (token: string) => (await bodyOf(await get('/api/my_naming_rights', token))).rights

describe('naming prizes at the end of the night', () => {
  it('lists tonight’s prizes by place before the game', async () => {
    const a = await player('A')
    const { prizes } = await bodyOf(await get(`/api/event_prizes?event_id=${eventId}`, a.token))
    expect(prizes.map((p: { place: number; animal: { species: string } }) => [p.place, p.animal.species])).toEqual([
      [1, 'African penguin chick'],
      [2, 'Giant Pacific octopus'],
      [3, 'Pacific seahorse'],
    ])
  })

  it('gives place 1, 2 and 3 their animals, nothing to a team on zero, and every player follows the night’s animals', async () => {
    const first = await player('First', 'Firsts')
    const mate = await player('Mate')
    await post('/api/join_team', mate.token, { team_id: first.teamId })
    const second = await player('Second', 'Seconds')
    const third = await player('Third', 'Thirds')
    const zero = await player('Zero', 'Zeros')
    await endTheNight({ [first.teamId]: 30, [second.teamId]: 20, [third.teamId]: 10 })

    const species = async (token: string) => (await rightsOf(token)).map((r: { place: number; animal: { species: string } }) => `${r.place} ${r.animal.species}`)
    expect(await species(first.token)).toEqual(['1 African penguin chick'])
    expect(await species(mate.token)).toEqual(['1 African penguin chick'])
    expect(await species(second.token)).toEqual(['2 Giant Pacific octopus'])
    expect(await species(third.token)).toEqual(['3 Pacific seahorse'])
    expect(await species(zero.token)).toEqual([])
    expect((await rightsOf(first.token))[0]).toMatchObject({ status: 'open', team_name: 'Firsts', animal: { name: null } })

    const followed = (await bodyOf(await get('/api/animals', zero.token))).animals.filter((a: { following: boolean }) => a.following)
    expect(followed).toHaveLength(3)
  })

  it('gives tied teams a right each, and staff pick one name', async () => {
    const a = await player('A', 'Alpha')
    const b = await player('B', 'Bravo')
    await endTheNight({ [a.teamId]: 10, [b.teamId]: 10 })
    const [ra] = await rightsOf(a.token)
    const [rb] = await rightsOf(b.token)
    expect([ra.place, rb.place]).toEqual([1, 1])
    await post('/api/propose_animal_name', a.token, { right_id: ra.id, name: 'Waddles' })
    await post('/api/propose_animal_name', b.token, { right_id: rb.id, name: 'Pebble' })
    expect((await post('/api/staff_review_animal_name', staff, { right_id: rb.id, status: 'approved' })).status).toBe(200)
    expect(await bodyOf(await post('/api/staff_review_animal_name', staff, { right_id: ra.id, status: 'approved' }))).toEqual({ error: 'already_named' })
    expect(await bodyOf(await post('/api/propose_animal_name', a.token, { right_id: ra.id, name: 'Another' }))).toEqual({ error: 'already_named' })
  })
})

describe('naming an animal', () => {
  it('lets any member propose, checks the name, and names the animal once staff approve', async () => {
    const a = await player('Ana', 'Anglers')
    const mate = await player('Mo')
    await post('/api/join_team', mate.token, { team_id: a.teamId })
    const outsider = await player('Out', 'Outsiders')
    await endTheNight({ [a.teamId]: 20 })
    const [right] = await rightsOf(a.token)

    expect((await post('/api/propose_animal_name', outsider.token, { right_id: right.id, name: 'Nope' })).status).toBe(403)
    expect((await post('/api/propose_animal_name', a.token, { right_id: right.id, name: 'shithead' })).status).toBe(400)
    expect((await post('/api/propose_animal_name', a.token, { right_id: right.id, name: '' })).status).toBe(400)
    expect(await bodyOf(await post('/api/propose_animal_name', a.token, { right_id: right.id, name: 'Waddles' }))).toMatchObject({ status: 'pending', proposed_name: 'Waddles' })
    // Last proposal wins.
    await post('/api/propose_animal_name', mate.token, { right_id: right.id, name: 'Sir Flaps' })

    const pending = (await bodyOf(await get('/api/staff_animals', staff))).rights
    expect(pending).toMatchObject([{ id: right.id, proposed_name: 'Sir Flaps', team_name: 'Anglers', join_code: 'DEMO1', place: 1 }])

    // Rejected: the team can try again.
    await post('/api/staff_review_animal_name', staff, { right_id: right.id, status: 'rejected' })
    expect((await rightsOf(a.token))[0]).toMatchObject({ status: 'rejected' })
    expect(await bodyOf(await post('/api/staff_review_animal_name', staff, { right_id: right.id, status: 'approved' }))).toEqual({ error: 'not_pending' })
    await post('/api/propose_animal_name', a.token, { right_id: right.id, name: 'Waddles' })
    await post('/api/staff_review_animal_name', staff, { right_id: right.id, status: 'approved' })

    expect((await rightsOf(mate.token))[0]).toMatchObject({ status: 'approved', animal: { name: 'Waddles' } })
    const named = test.db.select().from(t.animals).where(eq(t.animals.name, 'Waddles')).get()!
    expect(named).toMatchObject({ species: 'African penguin chick', namedEventId: eventId, namedByTeam: null }) // team name never approved
    expect((await bodyOf(await get('/api/staff_animals', staff))).rights).toEqual([])
  })

  it('credits the team when its name was approved', async () => {
    const a = await player('Ana', 'Anglers')
    await post('/api/host_review_team_name', host, { team_id: a.teamId, name_status: 'approved' })
    await endTheNight({ [a.teamId]: 20 })
    const [right] = await rightsOf(a.token)
    await post('/api/propose_animal_name', a.token, { right_id: right.id, name: 'Waddles' })
    await post('/api/staff_review_animal_name', staff, { right_id: right.id, status: 'approved' })
    const detail = await bodyOf(await get(`/api/animal?animal_id=${right.animal.id}`, a.token))
    expect(detail).toMatchObject({ name: 'Waddles', named_by_team: 'Anglers', following: true })
  })
})

describe('the My Animal feed', () => {
  it('lists named and followed animals, follows and unfollows, and shows staff updates newest first', async () => {
    const a = await player('Ana')
    const list = async () => (await bodyOf(await get('/api/animals', a.token))).animals
    // Before playing: only the already-named animal.
    expect((await list()).map((x: { name: string | null }) => x.name)).toEqual(['Noodle'])
    const noodle = (await list())[0]
    expect(noodle).toMatchObject({ following: false, update_count: 2 })

    expect(await bodyOf(await post('/api/follow_animal', a.token, { animal_id: noodle.id, follow: true }))).toEqual({ following: true })
    expect((await list())[0].following).toBe(true)

    await post('/api/staff_post_animal_update', staff, { animal_id: noodle.id, body: 'Noodle found a new cave.' })
    expect((await post('/api/staff_post_animal_update', staff, { animal_id: noodle.id, body: '   ' })).status).toBe(400)
    const detail = await bodyOf(await get(`/api/animal?animal_id=${noodle.id}`, a.token))
    expect(detail.updates).toHaveLength(3)
    expect(detail.updates[0].body).toBe('Noodle found a new cave.')
    expect(detail.latest_update.body).toBe('Noodle found a new cave.')

    await post('/api/follow_animal', a.token, { animal_id: noodle.id, follow: false })
    expect((await list())[0].following).toBe(false)
    expect((await post('/api/follow_animal', a.token, { animal_id: crypto.randomUUID(), follow: true })).status).toBe(404)
  })

  it('removes follows and keeps the animal’s name when a player deletes their data', async () => {
    const a = await player('Gone')
    const [noodle] = (await bodyOf(await get('/api/animals', a.token))).animals
    await post('/api/follow_animal', a.token, { animal_id: noodle.id, follow: true })
    await post('/api/delete_my_account', a.token, {})
    expect(test.db.select().from(t.animalFollows).all()).toEqual([])
    expect(test.db.select().from(t.animals).where(eq(t.animals.id, noodle.id)).get()?.name).toBe('Noodle')
  })
})

describe('staff manage animals and prizes', () => {
  it('adds an animal, offers it at a night, and refuses taken, named or ended cases', async () => {
    const created = await bodyOf(await post('/api/staff_create_animal', staff, { species: 'Coral catshark', exhibit: 'Philippine Coral Reef' }))
    expect(created).toMatchObject({ species: 'Coral catshark', name: null, prize: null, scientific_name: null })

    const set = (place: number, animal_id: string | null, event = eventId) => post('/api/staff_set_naming_prize', staff, { event_id: event, place, animal_id })
    // Replace place 3 with the new animal; the seahorse is free again.
    const res = await bodyOf(await set(3, created.id))
    expect(res.prizes.map((p: { animal: { species: string } }) => p.animal.species)).toEqual(['African penguin chick', 'Giant Pacific octopus', 'Coral catshark'])
    // An animal can be offered at one place only.
    expect(await bodyOf(await set(4, created.id))).toEqual({ error: 'animal_taken' })
    const noodle = test.db.select().from(t.animals).where(eq(t.animals.name, 'Noodle')).get()!
    expect(await bodyOf(await set(4, noodle.id))).toEqual({ error: 'already_named' })
    // Clearing a place.
    expect((await bodyOf(await set(3, null))).prizes).toHaveLength(2)

    await endTheNight({})
    expect(await bodyOf(await set(3, created.id))).toEqual({ error: 'event_ended' })
    expect((await post('/api/staff_create_animal', host, { species: 'X', exhibit: 'Y' })).status).toBe(403)
  })

  it('stores the avatar staff choose', async () => {
    const created = await bodyOf(await post('/api/staff_create_animal', staff, { species: 'Moray eel', exhibit: 'Philippine Coral Reef', avatar: 'moray-eel' }))
    expect(created.avatar).toBe('moray-eel')
  })

  it('defaults a new animal to the mystery avatar', async () => {
    const created = await bodyOf(await post('/api/staff_create_animal', staff, { species: 'Coral catshark', exhibit: 'Philippine Coral Reef' }))
    expect(created.avatar).toBe('mystery')
  })

  it('rejects an unknown avatar', async () => {
    const res = await post('/api/staff_create_animal', staff, { species: 'Shark', exhibit: 'Y', avatar: 'shark' })
    expect(res.status).toBe(400)
  })
})
