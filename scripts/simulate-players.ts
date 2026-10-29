// npm run simulate -- --teams 40 [--url http://localhost:3000] [--code DEMO1] [--questions 10]
// Load test (docs/SPEC.md sections 8 and 9): N fake teams (default 40, max 150), each with its own
// guest session and WebSocket, answer with random delays and some typos, and randomly drop and
// reconnect. It also drives the game as the host (HOST_PASSCODE). After every lock it checks that
// each team's last accepted answer is the one the server stored, and reports lost or rejected
// submissions, submit latency, and how quickly the host's get_state answered throughout.
import WebSocket from 'ws'

type Options = {
  baseUrl: string
  joinCode: string
  teams: number
  hostPasscode: string
  questions: number
  /** Longest wait before a team answers, capped below the question's own time. */
  maxDelayMs: number
  typoRate: number
  dropRate: number
  log?: (line: string) => void
}

export type Report = {
  teams: number
  questions: number
  submits: number
  lost: number
  rejected: Record<string, number>
  submitMs: { p50: number; p95: number; max: number }
  hostMs: { p50: number; p95: number; max: number }
}

/** Response bodies, read loosely: this script checks the server's behaviour, not its types. */
// oxlint-disable-next-line typescript/no-explicit-any
type Json = any

const WORDS = ['octopus', 'anglerfish', 'hadal zone', 'dumbo octopus', 'sperm whale', 'bloop', 'bathypelagic', 'squid', 'kelp']

function cookieOf(res: Response): string {
  const set = res.headers.getSetCookie().find((c) => c.startsWith('nl_session='))
  if (!set) throw new Error('no session cookie')
  return set.split(';')[0]
}

const pct = (values: number[], p: number) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))])
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const typo = (word: string) => {
  const i = Math.floor(Math.random() * word.length)
  return word.slice(0, i) + word.slice(i + 1)
}

export async function simulate(options: Options): Promise<Report> {
  const { baseUrl, joinCode, hostPasscode, log = () => {} } = options
  const teamCount = Math.min(150, Math.max(1, options.teams))
  const origin = new URL(baseUrl).origin
  const submitMs: number[] = []
  const hostMs: number[] = []
  const rejected: Record<string, number> = {}
  let submits = 0
  let lost = 0

  const call = async (cookie: string, path: string, body?: unknown) => {
    const res = await fetch(new URL(path, baseUrl), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data: Json = await res.json().catch(() => null)
    return { status: res.status, body: data }
  }

  // The host.
  const login = await fetch(new URL('/api/login', baseUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode: hostPasscode }) })
  if (login.status !== 200) throw new Error(`host login failed (${login.status}); set HOST_PASSCODE`)
  const host = cookieOf(login)
  const timedHostState = async (eventId: string) => {
    const started = performance.now()
    const res = await call(host, `/api/get_state?event_id=${eventId}`)
    hostMs.push(performance.now() - started)
    return res.body
  }

  // The teams: a guest session, a team, and a socket each.
  type Team = { cookie: string; socket: WebSocket | null; accepted: unknown; answeredQuestion: string | null; closed: boolean }
  const teams: Team[] = []
  let eventId = ''
  for (let i = 0; i < teamCount; i++) {
    const join = await fetch(new URL('/api/join_event', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ join_code: joinCode, nickname: `Sim ${i + 1}` }),
    })
    if (join.status !== 200) throw new Error(`join failed (${join.status})`)
    const cookie = cookieOf(join)
    eventId = ((await join.json()) as { event: { id: string } }).event.id
    const team = await call(cookie, '/api/create_team', { event_id: eventId, name: `Sim Team ${i + 1}` })
    if (team.status !== 200) throw new Error(`create_team failed (${team.status}: ${JSON.stringify(team.body)})`)
    teams.push({ cookie, socket: null, accepted: null, answeredQuestion: null, closed: false })
  }
  log(`${teams.length} teams joined ${joinCode}`)

  const answerFor = (payload: { type: string; options: string[] | null }) => {
    switch (payload.type) {
      case 'mc':
        return { option: Math.floor(Math.random() * (payload.options?.length ?? 2)) }
      case 'true_false':
        return { option: Math.floor(Math.random() * 2) }
      case 'typed': {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)]
        return { text: Math.random() < options.typoRate ? typo(word) : word }
      }
      default:
        return { number: Math.round(Math.random() * 5000) }
    }
  }

  const answer = async (team: Team, state: { current_event_question_id: string; live_payload: { type: string; options: string[] | null; duration_s: number } }) => {
    const questionId = state.current_event_question_id
    if (team.answeredQuestion === questionId) return
    team.answeredQuestion = questionId
    await sleep(Math.random() * Math.min(options.maxDelayMs, state.live_payload.duration_s * 600))
    const value = answerFor(state.live_payload)
    const started = performance.now()
    const res = await call(team.cookie, '/api/submit_answer', { event_question_id: questionId, answer: value, is_draft: false })
    submitMs.push(performance.now() - started)
    submits++
    if (res.status === 200) team.accepted = value
    else rejected[res.body?.error ?? String(res.status)] = (rejected[res.body?.error ?? String(res.status)] ?? 0) + 1
  }

  const connect = (team: Team) => {
    const url = `${baseUrl.replace(/^http/, 'ws')}/ws?event_id=${eventId}`
    const socket = new WebSocket(url, { headers: { cookie: team.cookie, origin } })
    team.socket = socket
    socket.on('message', (data) => {
      const message = JSON.parse(String(data))
      if (message.type === 'state' && (message.state.phase === 'live' || message.state.phase === 'final_live')) void answer(team, message.state)
    })
    socket.on('error', () => {})
    socket.on('close', () => {
      // A dropped phone reconnects after a moment and catches up from get_state.
      if (team.closed) return
      setTimeout(async () => {
        if (team.closed) return
        connect(team)
        const view = await call(team.cookie, `/api/get_state?event_id=${eventId}`)
        if (view.body?.state && ['live', 'final_live'].includes(view.body.state.phase)) void answer(team, view.body.state)
      }, 500 + Math.random() * 1500)
    })
  }
  teams.forEach(connect)
  await sleep(500)

  // The host plays the night, checking every team's stored answer at each lock.
  let played = 0
  for (let step = 0; step < 500 && played < options.questions; step++) {
    const view = await timedHostState(eventId)
    const phase = view.state.phase
    if (phase === 'ended') break
    if (phase === 'live' || phase === 'final_live') {
      const deadline = Date.now() + Math.min(options.maxDelayMs + 3000, view.state.live_payload.duration_s * 1000)
      for (const team of teams) if (Math.random() < options.dropRate) team.socket?.terminate()
      while (Date.now() < deadline) {
        const counts = (await timedHostState(eventId)).host
        if (counts.answered_teams >= teams.length) break
        await sleep(200)
      }
      await call(host, '/api/host_lock', { event_id: eventId })
      for (const team of teams) {
        if (team.answeredQuestion !== view.state.current_event_question_id || team.accepted === null) continue
        const stored = (await call(team.cookie, `/api/get_state?event_id=${eventId}`)).body?.submission?.answer
        if (JSON.stringify(stored) !== JSON.stringify(team.accepted)) lost++
      }
      for (const team of teams) team.accepted = null
      played++
      log(`question ${played}: ${submits} submits so far, ${lost} lost`)
      await call(host, '/api/host_reveal', { event_id: eventId })
    } else if (phase === 'locked' || phase === 'final_locked') {
      await call(host, '/api/host_reveal', { event_id: eventId })
    } else {
      await call(host, '/api/host_next', { event_id: eventId })
    }
  }

  for (const team of teams) {
    team.closed = true
    team.socket?.close()
  }
  return {
    teams: teams.length,
    questions: played,
    submits,
    lost,
    rejected,
    submitMs: { p50: pct(submitMs, 50), p95: pct(submitMs, 95), max: pct(submitMs, 100) },
    hostMs: { p50: pct(hostMs, 50), p95: pct(hostMs, 95), max: pct(hostMs, 100) },
  }
}

// CLI
if (process.argv[1] && /simulate-players\.[tj]s$/.test(process.argv[1])) {
  const arg = (name: string, fallback: string) => {
    const i = process.argv.indexOf(`--${name}`)
    return i >= 0 ? process.argv[i + 1] : fallback
  }
  const { env } = await import('../server/env')
  const report = await simulate({
    baseUrl: arg('url', `http://localhost:${env.PORT}`),
    joinCode: arg('code', 'DEMO1'),
    teams: Number(arg('teams', '40')),
    questions: Number(arg('questions', '1000')),
    hostPasscode: env.HOST_PASSCODE ?? '',
    maxDelayMs: Number(arg('max-delay', '8000')),
    typoRate: 0.2,
    dropRate: 0.1,
    log: console.log,
  })
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.lost > 0 ? 1 : 0
}
