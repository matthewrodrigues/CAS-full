// Milestone 1 done-when: a player session cannot get question_answers, other teams'
// submissions, or any host or staff route (docs/SPEC.md sections 6 and 8).
import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { isValidator } from '../api/validate'
import { routeAccess, type RouteAccess } from '../auth/guards'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import { ANSWER_SENTINEL, buildFixture, TEAM_A_ANSWER, TEAM_B_ANSWER, type Fixture } from './fixtures'
import { bodyOf, call, makeTestApp, sessionFor } from './helpers'

type App = ReturnType<typeof makeTestApp>['app']
type ApiRoute = { method: string; path: string; access: RouteAccess | undefined; validated: boolean }

/** Every /api route with the access tag and validator found among its handlers. */
function apiRoutes(app: App): ApiRoute[] {
  const handlers = new Map<string, unknown[]>()
  for (const route of app.routes) {
    if (route.method === 'ALL' || !route.path.startsWith('/api/')) continue
    const key = `${route.method} ${route.path}`
    handlers.set(key, [...(handlers.get(key) ?? []), route.handler])
  }
  return [...handlers].map(([key, list]) => {
    const [method, path] = key.split(' ')
    return { method, path, access: list.map(routeAccess).find(Boolean), validated: list.some(isValidator) }
  })
}

const PRIVILEGED_ROUTES = [
  '/api/host_adjust_score',
  '/api/host_lock',
  '/api/host_next',
  '/api/host_open_question',
  '/api/host_override',
  '/api/host_pause',
  '/api/host_resume',
  '/api/host_reveal',
  '/api/host_skip',
  '/api/redeem_code',
]

let app: App
let db: Db
let f: Fixture
let routes: ApiRoute[]

beforeEach(() => {
  ;({ app, db } = makeTestApp())
  f = buildFixture(db)
  routes = apiRoutes(app)
})

const request = (route: ApiRoute, token?: string) =>
  call(app, route.method, route.path, { token, body: route.method === 'POST' ? {} : undefined })

describe('route declarations', () => {
  it('every /api route declares its access', () => {
    expect(routes.length).toBeGreaterThan(15)
    expect(routes.filter((r) => !r.access).map((r) => `${r.method} ${r.path}`)).toEqual([])
  })

  it('every POST /api route validates its body with zod', () => {
    expect(routes.filter((r) => r.method === 'POST').length).toBeGreaterThan(PRIVILEGED_ROUTES.length)
    expect(routes.filter((r) => r.method === 'POST' && !r.validated).map((r) => r.path)).toEqual([])
  })

  it('host and staff guard exactly the host operations and redeem_code', () => {
    const privileged = routes.filter((r) => r.access === 'host' || r.access === 'staff')
    expect(privileged.map((r) => r.path).sort()).toEqual(PRIVILEGED_ROUTES)
    expect(privileged.find((r) => r.path === '/api/redeem_code')?.access).toBe('staff')
  })
})

describe('role checks', () => {
  it('a player session gets 403 from every host and staff route', async () => {
    const token = sessionFor(db, 'player', f.teamA.playerIds[0])
    const privileged = routes.filter((r) => r.access === 'host' || r.access === 'staff')
    expect(privileged).toHaveLength(PRIVILEGED_ROUTES.length)
    for (const route of privileged) {
      expect({ path: route.path, status: (await request(route, token)).status }).toEqual({ path: route.path, status: 403 })
    }
  })

  it('no session gets 401 from every non-public route', async () => {
    const guarded = routes.filter((r) => r.access !== 'public')
    expect(guarded.length).toBeGreaterThan(PRIVILEGED_ROUTES.length)
    for (const route of guarded) {
      expect({ path: route.path, status: (await request(route)).status }).toEqual({ path: route.path, status: 401 })
    }
  })

  it('a host session gets 403 from staff routes', async () => {
    const token = sessionFor(db, 'host')
    const staffOnly = routes.filter((r) => r.access === 'staff')
    expect(staffOnly).toHaveLength(1)
    for (const route of staffOnly) {
      expect((await request(route, token)).status).toBe(403)
    }
  })

  it('a staff session passes every host guard', async () => {
    const token = sessionFor(db, 'staff')
    const hostRoutes = routes.filter((r) => r.access === 'host')
    expect(hostRoutes).toHaveLength(PRIVILEGED_ROUTES.length - 1)
    for (const route of hostRoutes) {
      expect([401, 403]).not.toContain((await request(route, token)).status)
    }
  })
})

describe('data a player can read', () => {
  it('never includes question_answers', async () => {
    const token = sessionFor(db, 'player', f.teamA.playerIds[0])
    const query: Record<string, string> = { '/api/get_state': `?event_id=${f.eventId}` }
    const bodies: string[] = []

    for (const route of routes.filter((r) => r.method === 'GET' && (r.access === 'public' || r.access === 'player'))) {
      const res = await call(app, 'GET', route.path + (query[route.path] ?? ''), { token })
      expect({ path: route.path, status: res.status }).toEqual({ path: route.path, status: 200 })
      bodies.push(await res.text())
    }
    const join = await call(app, 'POST', '/api/join_event', { token, body: { join_code: 'FIXT1', nickname: 'Captain A' } })
    expect(join.status).toBe(200)
    bodies.push(await join.text())

    // The live question really is in there; only its answers must not be.
    expect(bodies.some((b) => b.includes('Name the fixture animal'))).toBe(true)
    for (const body of bodies) {
      for (const leak of [ANSWER_SENTINEL, 'accepted_answers', 'correct_option', 'numeric_answer']) {
        expect(body).not.toContain(leak)
      }
    }
  })

  it("get_state returns only the caller's own team submission", async () => {
    const token = sessionFor(db, 'player', f.teamA.playerIds[1])
    const res = await call(app, 'GET', `/api/get_state?event_id=${f.eventId}`, { token })
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(JSON.parse(text).submission).toMatchObject({ id: f.teamA.submissionId, answer: { text: TEAM_A_ANSWER } })
    expect(text).not.toContain(TEAM_B_ANSWER)
    expect(text).not.toContain(f.teamB.submissionId)
  })

  it('get_state gives a player on no team no submission', async () => {
    const playerId = randomUUID()
    db.insert(t.players).values({ id: playerId, nickname: 'Lone Diver' }).run()
    const res = await call(app, 'GET', `/api/get_state?event_id=${f.eventId}`, { token: sessionFor(db, 'player', playerId) })
    expect((await bodyOf(res)).submission).toBeNull()
  })

  it('get_state gives a host session no submission', async () => {
    const res = await call(app, 'GET', `/api/get_state?event_id=${f.eventId}`, { token: sessionFor(db, 'host') })
    const body = await bodyOf(res)
    expect(body.state.phase).toBe('live')
    expect(body.submission).toBeNull()
  })
})
