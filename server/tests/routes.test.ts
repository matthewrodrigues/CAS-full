// The game routes over HTTP: GameErrorCode → status, the new host and leaderboard routes, and
// what get_state adds for players and hosts (Milestone 2, Task 9).
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { seedDemo } from '../db/seed-demo'
import { bodyOf, call, cookieFrom, makeTestApp, sessionFor } from './helpers'

let test: ReturnType<typeof makeTestApp>
let eventId: string
let mediaDir: string
let host: string

beforeEach(() => {
  test = makeTestApp()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-routes-'))
  eventId = seedDemo(test.db, { mediaDir }).eventId
  host = sessionFor(test.db, 'host')
})

afterEach(() => {
  test.game.stop()
  rmSync(mediaDir, { recursive: true, force: true })
})

const post = (path: string, token: string, body: unknown) => call(test.app, 'POST', path, { token, body })
const get = (path: string, token: string) => call(test.app, 'GET', path, { token })
const hostDoes = (operation: string) => post(`/api/${operation}`, host, { event_id: eventId })

async function joinAs(nickname: string) {
  const res = await call(test.app, 'POST', '/api/join_event', { body: { join_code: 'DEMO1', nickname } })
  return cookieFrom(res)!
}
async function teamFor(nickname: string, name: string) {
  const token = await joinAs(nickname)
  const res = await post('/api/create_team', token, { event_id: eventId, name })
  expect(res.status).toBe(200)
  return { token, teamId: (await bodyOf(res)).id as string }
}
const currentQuestion = async (token: string) => (await bodyOf(await get(`/api/get_state?event_id=${eventId}`, token))).state.current_event_question_id
const answer = async (token: string, value: unknown, isDraft = false) =>
  post('/api/submit_answer', token, { event_question_id: await currentQuestion(token), answer: value, is_draft: isDraft })

describe('error statuses', () => {
  it('maps each game error to its HTTP status', async () => {
    const a = await teamFor('Ana', 'Anglers')
    const loner = await joinAs('Loner')

    expect(await bodyOf(await hostDoes('host_lock'))).toEqual({ error: 'wrong_phase' })
    expect((await hostDoes('host_lock')).status).toBe(409)
    expect((await post('/api/host_next', host, { event_id: crypto.randomUUID() })).status).toBe(404)
    expect((await post('/api/create_team', loner, { event_id: eventId, name: 'shit happens' })).status).toBe(400)

    await hostDoes('host_next') // question 1, mc
    expect((await answer(loner, { option: 0 })).status).toBe(403)
    expect((await answer(a.token, { text: 'Challenger Deep' })).status).toBe(400) // write 1 of 5 this second
    for (let i = 0; i < 4; i++) expect((await answer(a.token, { option: 0 }, true)).status).toBe(200)
    expect((await answer(a.token, { option: 0 }, true)).status).toBe(429)

    await hostDoes('host_pause')
    expect(await bodyOf(await answer(loner, { option: 0 }))).toEqual({ error: 'not_on_team' })
  })
})

describe('team names and the leaderboard', () => {
  const board = async (token: string) => (await bodyOf(await get(`/api/get_leaderboard?event_id=${eventId}`, token))).teams
  const nameOf = (rows: { team_id: string; name: string | null }[], teamId: string) => rows.find((r) => r.team_id === teamId)?.name

  it('shows pending names to other players, and hides rejected ones from everyone but the team', async () => {
    const a = await teamFor('Ana', 'Anglers')
    const b = await teamFor('Ben', 'Barreleyes')
    expect(await board(b.token)).toEqual([
      { team_id: a.teamId, name: 'Anglers', points: 0, rank: 1 },
      { team_id: b.teamId, name: 'Barreleyes', points: 0, rank: 1 },
    ])

    expect((await post('/api/host_review_team_name', host, { team_id: a.teamId, name_status: 'rejected' })).status).toBe(200)
    expect((await post('/api/host_review_team_name', a.token, { team_id: a.teamId, name_status: 'approved' })).status).toBe(403)
    expect(nameOf(await board(b.token), a.teamId)).toBeNull()
    expect(nameOf(await board(a.token), a.teamId)).toBe('Anglers')
    const teams = (await bodyOf(await get(`/api/get_state?event_id=${eventId}`, b.token))).teams
    expect(nameOf(teams.map((t: { id: string; name: string | null }) => ({ team_id: t.id, name: t.name })), a.teamId)).toBeNull()
    expect((await get(`/api/get_leaderboard?event_id=${crypto.randomUUID()}`, a.token)).status).toBe(404)
  })

  it('shows a host session (the big screen) approved names only', async () => {
    const a = await teamFor('Ana', 'Anglers')
    const b = await teamFor('Ben', 'Barreleyes')
    await post('/api/host_review_team_name', host, { team_id: a.teamId, name_status: 'approved' })

    const rows = await board(host)
    expect([nameOf(rows, a.teamId), nameOf(rows, b.teamId)]).toEqual(['Anglers', null])
    const view = await bodyOf(await get(`/api/get_state?event_id=${eventId}`, host))
    expect(view.teams.find((t: { id: string }) => t.id === b.teamId).name).toBeNull()
    expect(view.host.teams.find((t: { id: string }) => t.id === b.teamId)).toMatchObject({ name: 'Barreleyes', name_status: 'pending' })
  })
})

describe('host_events', () => {
  it('lists events for hosts, newest first, and refuses players', async () => {
    const res = await get('/api/host_events', host)
    expect(res.status).toBe(200)
    expect((await bodyOf(res)).events).toEqual([
      { id: eventId, join_code: 'DEMO1', status: 'ready', starts_at: expect.any(Number), theme: 'Deep Sea Night', phase: 'lobby' },
    ])
    expect((await get('/api/host_events', await joinAs('Nosy'))).status).toBe(403)
  })
})

describe('get_state', () => {
  it('names the event, so the big screen can show its join code', async () => {
    const view = await bodyOf(await get(`/api/get_state?event_id=${eventId}`, host))
    expect(view.event).toEqual({ id: eventId, join_code: 'DEMO1', status: 'ready' })
  })

  it("gives a player their team and the public team list, and a host the host view", async () => {
    const a = await teamFor('Ana', 'Anglers')
    await teamFor('Ben', 'Barreleyes')

    const player = await bodyOf(await get(`/api/get_state?event_id=${eventId}`, a.token))
    expect(player.my_team).toMatchObject({ id: a.teamId, name: 'Anglers', name_status: 'pending', score: 0 })
    expect(player.teams).toEqual(
      expect.arrayContaining([
        { id: a.teamId, name: 'Anglers', member_count: 1 },
        { id: expect.any(String), name: 'Barreleyes', member_count: 1 },
      ]),
    )
    expect(player).not.toHaveProperty('host')
    expect(player.settings).toEqual({ max_team_size: 6, team_submissions: 'any_member', live_background: 'cream' })

    const hostView = await bodyOf(await get(`/api/get_state?event_id=${eventId}`, host))
    expect(hostView.host).toMatchObject({ connected_teams: 0, answered_teams: 0, review_queue: [] })
    expect(hostView.host.teams.map((t: { name: string }) => t.name).sort()).toEqual(['Anglers', 'Barreleyes'])
  })

  it("shows the team's result and points only after the reveal", async () => {
    const a = await teamFor('Ana', 'Anglers')
    await hostDoes('host_next')
    await answer(a.token, { option: 0 })
    const submission = async () => (await bodyOf(await get(`/api/get_state?event_id=${eventId}`, a.token))).submission

    expect(await submission()).toMatchObject({ answer: { option: 0 }, result: null, points: null })
    await hostDoes('host_lock')
    expect(await submission()).toMatchObject({ result: null, points: null })
    await hostDoes('host_reveal')
    expect(await submission()).toMatchObject({ result: 'correct', points: 10 })
  })
})
