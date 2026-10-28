// /ws over a real server (docs/SPEC.md section 5, Real-time): rooms, the first state message,
// and the Origin and session checks on the upgrade.
import { mkdtempSync, rmSync } from 'node:fs'
import { createConnection, type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ServerType } from '@hono/node-server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { ServerMessage } from '../../shared/messages'
import { SESSION_COOKIE } from '../auth/sessions'
import { seedDemo } from '../db/seed-demo'
import { startServer } from '../serve'
import { bodyOf, call, cookieFrom, makeTestApp, sessionFor } from './helpers'

let server: ServerType
let port: number
let mediaDir: string
let test: ReturnType<typeof makeTestApp>
let eventId: string
const sockets: WebSocket[] = []

beforeEach(async () => {
  test = makeTestApp()
  mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-ws-'))
  eventId = seedDemo(test.db, { mediaDir }).eventId
  server = await new Promise<ServerType>((resolve) => {
    const s = startServer(test.app.fetch, 0, () => resolve(s))
  })
  port = (server.address() as AddressInfo).port
})

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.terminate()
  test.game.stop()
  // fetch keeps its connection alive; close it rather than wait for the idle timeout.
  ;(server as import('node:http').Server).closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  rmSync(mediaDir, { recursive: true, force: true })
})

/** A WebSocket that records every message, with a way to wait for one. */
function connect({ token, origin = `http://127.0.0.1:${port}`, event = eventId }: { token?: string; origin?: string; event?: string }) {
  const headers: Record<string, string> = { origin }
  if (token) headers.cookie = `${SESSION_COOKIE}=${token}`
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?event_id=${event}`, { headers })
  sockets.push(socket)
  const received: ServerMessage[] = []
  const waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = []
  socket.on('message', (data) => {
    const message = JSON.parse(String(data)) as ServerMessage
    received.push(message)
    for (const w of waiters.splice(0)) {
      if (w.match(message)) w.resolve(message)
      else waiters.push(w)
    }
  })
  const next = (match: (m: ServerMessage) => boolean = () => true) =>
    new Promise<ServerMessage>((resolve, reject) => {
      const seen = received.find(match)
      if (seen) return resolve(seen)
      waiters.push({ match, resolve })
      setTimeout(() => reject(new Error('no matching message')), 3000)
    })
  const opened = new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)))
    socket.once('error', reject)
  })
  return { socket, received, next, opened }
}

/** Joins DEMO1 over HTTP and creates a team; returns the player's cookie token. */
async function playerOnTeam(nickname: string, team: string) {
  const join = await call(test.app, 'POST', '/api/join_event', { body: { join_code: 'DEMO1', nickname } })
  const token = cookieFrom(join)!
  const created = await call(test.app, 'POST', '/api/create_team', { token, body: { event_id: eventId, name: team } })
  expect(created.status).toBe(200)
  return { token, teamId: (await bodyOf(created)).id as string }
}

describe('/ws', () => {
  it('sends the current state first, and answers ping with pong', async () => {
    const { token } = await playerOnTeam('Ana', 'Anglers')
    const ws = connect({ token })
    await ws.opened
    expect(await ws.next()).toMatchObject({ type: 'state', state: { phase: 'lobby' } })
    ws.socket.send(JSON.stringify({ type: 'ping' }))
    expect(await ws.next((m) => m.type === 'pong')).toEqual({ type: 'pong' })
  })

  it('ignores messages that are not a valid ping', async () => {
    const { token } = await playerOnTeam('Ana', 'Anglers')
    const ws = connect({ token })
    await ws.opened
    ws.socket.send('not json')
    ws.socket.send(JSON.stringify({ type: 'submit_answer', answer: 'x' }))
    ws.socket.send(JSON.stringify({ type: 'ping' }))
    await ws.next((m) => m.type === 'pong')
    expect(ws.received.map((m) => m.type)).toEqual(['state', 'pong'])
  })

  it('refuses an upgrade without a session (401), from a foreign Origin (403), or for an unknown event (404)', async () => {
    await expect(connect({}).opened).rejects.toThrow('HTTP 401')
    const { token } = await playerOnTeam('Ana', 'Anglers')
    await expect(connect({ token, origin: 'https://evil.example' }).opened).rejects.toThrow('HTTP 403')
    await expect(connect({ token, event: crypto.randomUUID() }).opened).rejects.toThrow('HTTP 404')
    await expect(connect({ token, event: 'not-a-uuid' }).opened).rejects.toThrow('HTTP 400')
  })

  it('survives clients that reset the connection after a refused upgrade', async () => {
    // Without an error listener on the upgrade socket, each reset is an uncaught exception.
    for (let i = 0; i < 20; i++) {
      await new Promise<void>((resolve) => {
        const socket = createConnection(port, '127.0.0.1', () => {
          socket.write(
            `GET /ws?event_id=${eventId} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nOrigin: http://127.0.0.1:${port}\r\n` +
              'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n',
          )
        })
        socket.on('error', () => {})
        socket.once('data', () => {
          socket.write('more bytes after the refusal')
          setTimeout(() => socket.resetAndDestroy(), 5)
        })
        socket.on('close', () => resolve())
      })
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
    const health = await fetch(`http://127.0.0.1:${port}/api/health`)
    expect(health.status).toBe(200)
  })

  it('pushes state to every player, team submissions to that team only, and counts to hosts', async () => {
    const a = await playerOnTeam('Ana', 'Anglers')
    const b = await playerOnTeam('Ben', 'Barreleyes')
    const host = sessionFor(test.db, 'host')
    const wsA = connect({ token: a.token })
    const wsB = connect({ token: b.token })
    const wsHost = connect({ token: host })
    await Promise.all([wsA.opened, wsB.opened, wsHost.opened])
    await Promise.all([wsA.next(), wsB.next(), wsHost.next()])

    expect((await call(test.app, 'POST', '/api/host_next', { token: host, body: { event_id: eventId } })).status).toBe(200)
    const live = (m: ServerMessage) => m.type === 'state' && m.state.phase === 'live'
    await Promise.all([wsA.next(live), wsB.next(live), wsHost.next(live)])

    const state = await bodyOf(await call(test.app, 'GET', `/api/get_state?event_id=${eventId}`, { token: a.token }))
    const submitted = await call(test.app, 'POST', '/api/submit_answer', {
      token: a.token,
      body: { event_question_id: state.state.current_event_question_id, answer: { option: 0 }, is_draft: false },
    })
    expect(submitted.status).toBe(200)

    expect(await wsA.next((m) => m.type === 'team_submission')).toMatchObject({ submission: { answer: { option: 0 } } })
    expect(await wsHost.next((m) => m.type === 'host_stats' && m.answered_teams === 1)).toEqual({
      type: 'host_stats',
      connected_teams: 2,
      answered_teams: 1,
    })
    wsB.socket.send(JSON.stringify({ type: 'ping' }))
    await wsB.next((m) => m.type === 'pong')
    expect(wsB.received.some((m) => m.type === 'team_submission')).toBe(false)
  })
})
