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
  it('shows a team name to others only once a host approves it', async () => {
    const a = await teamFor('Ana', 'Anglers')
    const b = await teamFor('Ben', 'Barreleyes')
    expect((await post('/api/host_review_team_name', host, { team_id: a.teamId, name_status: 'approved' })).status).toBe(200)
    expect((await post('/api/host_review_team_name', a.token, { team_id: a.teamId, name_status: 'approved' })).status).toBe(403)

    const board = async (token: string) => (await bodyOf(await get(`/api/get_leaderboard?event_id=${eventId}`, token))).teams
    expect(await board(b.token)).toEqual([
      { team_id: a.teamId, name: 'Anglers', points: 0, rank: 1 },
      { team_id: b.teamId, name: 'Barreleyes', points: 0, rank: 1 },
    ])
    expect((await board(a.token)).find((t: { team_id: string }) => t.team_id === b.teamId).name).toBeNull()
    expect((await get(`/api/get_leaderboard?event_id=${crypto.randomUUID()}`, a.token)).status).toBe(404)
  })
})

describe('get_state', () => {
  it("gives a player their team and the public team list, and a host the host view", async () => {
    const a = await teamFor('Ana', 'Anglers')
    await teamFor('Ben', 'Barreleyes')

    const player = await bodyOf(await get(`/api/get_state?event_id=${eventId}`, a.token))
    expect(player.my_team).toMatchObject({ id: a.teamId, name: 'Anglers', name_status: 'pending', score: 0 })
    expect(player.teams).toEqual(
      expect.arrayContaining([
        { id: a.teamId, name: 'Anglers', member_count: 1 },
        { id: expect.any(String), name: null, member_count: 1 },
      ]),
    )
    expect(player).not.toHaveProperty('host')

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
