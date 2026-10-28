// Milestone 6 (docs/SPEC.md sections 4, 6 and 8): prizes at the end of the night, staff
// redemption, feedback, newsletter consent, account deletion and the configurable settings.
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
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-rewards-'))
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

/** Plays to the end; `score` gives each team its points by host adjustment. */
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

describe('prizes at the end of the night', () => {
  it('gives tier 1 to the winning team, tier 2 to the runner-up and the last tier to every team', async () => {
    const winner = await player('Win', 'Winners')
    const winnerMate = await player('Mate')
    await post('/api/join_team', winnerMate.token, { team_id: winner.teamId })
    const second = await player('Sec', 'Seconds')
    const third = await player('Thi', 'Thirds')
    await endTheNight({ [winner.teamId]: 30, [second.teamId]: 20, [third.teamId]: 10 })

    const names = async (token: string) => (await bodyOf(await get('/api/my_rewards', token))).rewards.map((r: { name: string }) => r.name).sort()
    expect(await names(winner.token)).toEqual(['Thanks for playing', 'Top team prize'])
    expect(await names(winnerMate.token)).toEqual(['Thanks for playing', 'Top team prize'])
    expect(await names(second.token)).toEqual(['Runner-up prize', 'Thanks for playing'])
    expect(await names(third.token)).toEqual(['Thanks for playing'])

    const [award] = (await bodyOf(await get('/api/my_rewards', third.token))).rewards
    expect(award.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/)
    expect(award).toMatchObject({ status: 'issued', expires_at: expect.any(Number) })
  })

  it('shares a tier between tied teams and gives nothing to a team on zero for tiers 1 and 2', async () => {
    const a = await player('A', 'Alpha')
    const b = await player('B', 'Bravo')
    const c = await player('C', 'Charlie')
    await endTheNight({ [a.teamId]: 10, [b.teamId]: 10 })
    const count = (token: string) => get('/api/my_rewards', token).then(bodyOf).then((r) => r.rewards.length)
    expect([await count(a.token), await count(b.token), await count(c.token)]).toEqual([2, 2, 1])
  })
})

describe('redeem_code (staff)', () => {
  it('redeems an issued code once, and refuses expired and unknown codes', async () => {
    const a = await player('A', 'Alpha')
    await endTheNight({ [a.teamId]: 10 })
    const codes = (await bodyOf(await get('/api/my_rewards', a.token))).rewards.map((r: { code: string }) => r.code)

    expect((await post('/api/redeem_code', host, { code: codes[0] })).status).toBe(403)
    const redeemed = await post('/api/redeem_code', staff, { code: codes[0].toLowerCase() })
    expect(redeemed.status).toBe(200)
    expect(await bodyOf(redeemed)).toMatchObject({ code: codes[0], status: 'redeemed', reward: expect.any(String) })
    expect(await bodyOf(await post('/api/redeem_code', staff, { code: codes[0] }))).toEqual({ error: 'already_redeemed' })
    expect((await post('/api/redeem_code', staff, { code: 'ZZZZZZZZZZ' })).status).toBe(404)

    test.db.update(t.rewardAwards).set({ expiresAt: Date.now() - 1 }).where(eq(t.rewardAwards.code, codes[1])).run()
    expect(await bodyOf(await post('/api/redeem_code', staff, { code: codes[1] }))).toEqual({ error: 'code_expired' })

    const list = (await bodyOf(await get('/api/staff_awards', staff))).awards
    expect(list.map((r: { status: string }) => r.status).sort()).toEqual(['expired', 'redeemed'])
    expect((await get('/api/staff_awards', host)).status).toBe(403)
  })
})

describe('feedback, newsletter and account deletion', () => {
  it('keeps one 1–5 rating per player per event', async () => {
    const a = await player('A', 'Alpha')
    expect((await post('/api/submit_feedback', a.token, { event_id: eventId, rating: 6 })).status).toBe(400)
    expect((await post('/api/submit_feedback', a.token, { event_id: eventId, rating: 3 })).status).toBe(200)
    expect((await post('/api/submit_feedback', a.token, { event_id: eventId, rating: 5, comment: 'Loved it' })).status).toBe(200)
    expect(test.db.select().from(t.feedback).all()).toMatchObject([{ rating: 5, comment: 'Loved it' }])
  })

  it('stores newsletter consent only when the box was ticked, and exports CSV for staff', async () => {
    const a = await player('A')
    expect((await post('/api/newsletter_optin', a.token, { email: 'ana@example.com', consent: false })).status).toBe(400)
    expect((await post('/api/newsletter_optin', a.token, { email: 'not-an-email', consent: true })).status).toBe(400)
    expect((await post('/api/newsletter_optin', a.token, { email: 'ana@example.com', consent: true })).status).toBe(200)
    const csv = await get('/api/staff_newsletter_csv', staff)
    expect(csv.headers.get('content-type')).toContain('text/csv')
    const text = await csv.text()
    expect(text.split('\n')[0]).toBe('email,topics,consent_at,source')
    expect(text).toContain('ana@example.com')
    expect((await get('/api/staff_newsletter_csv', host)).status).toBe(403)
  })

  it('deletes the player and their session but keeps the team score', async () => {
    const a = await player('Gone', 'Ghosts')
    await post('/api/host_adjust_score', host, { team_id: a.teamId, points: 10, note: 'Setup' })
    const res = await post('/api/delete_my_account', a.token, {})
    expect(res.status).toBe(200)
    expect(test.db.select().from(t.players).where(eq(t.players.nickname, 'Gone')).all()).toEqual([])
    expect((await get('/api/me', a.token).then(bodyOf)).role).toBeNull()
    const board = (await bodyOf(await get(`/api/get_leaderboard?event_id=${eventId}`, host))).teams
    expect(board.find((r: { team_id: string }) => r.team_id === a.teamId).points).toBe(10)
  })
})

describe('event settings (staff)', () => {
  it('reads and changes the configurable settings, validated', async () => {
    const read = async () => (await bodyOf(await get(`/api/staff_event_settings?event_id=${eventId}`, staff))).settings
    expect(await read()).toMatchObject({ max_team_size: 6, team_submissions: 'any_member', speed_bonus: 'off', live_background: 'cream' })
    const saved = await post('/api/staff_update_settings', staff, { event_id: eventId, settings: { speed_bonus: 'tiered', live_background: 'violet' } })
    expect(saved.status).toBe(200)
    expect(await read()).toMatchObject({ speed_bonus: 'tiered', live_background: 'violet', max_team_size: 6 })
    expect((await post('/api/staff_update_settings', staff, { event_id: eventId, settings: { review_threshold: 0.9, auto_accept_threshold: 0.8 } })).status).toBe(400)
    expect((await post('/api/staff_update_settings', host, { event_id: eventId, settings: {} })).status).toBe(403)
  })
})
