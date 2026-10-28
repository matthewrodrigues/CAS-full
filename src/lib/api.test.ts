import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

type Call = { url: string; init: RequestInit }

function stubFetch(status: number, body: unknown) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('posts JSON to the route and returns the body', async () => {
    const calls = stubFetch(200, { player: { id: 'p1', nickname: 'Ana' } })
    const result = await api.joinEvent({ join_code: 'DEMO1', nickname: 'Ana' })

    expect(result).toEqual({ player: { id: 'p1', nickname: 'Ana' } })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/join_event')
    expect(calls[0].init.method).toBe('POST')
    expect(new Headers(calls[0].init.headers).get('content-type')).toBe('application/json')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ join_code: 'DEMO1', nickname: 'Ana' })
    expect(calls[0].init.credentials).toBe('same-origin')
  })

  it('puts event_id in the query for reads', async () => {
    const calls = stubFetch(200, { teams: [] })
    await api.getLeaderboard('e 1')
    expect(calls[0].url).toBe('/api/get_leaderboard?event_id=e%201')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.body).toBeUndefined()
  })

  it("throws ApiError with the server's code and status", async () => {
    stubFetch(409, { error: 'too_late' })
    const error = await api.submitAnswer({ event_question_id: 'q', answer: { option: 0 }, is_draft: false }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'too_late' })
  })

  it('maps a failed fetch to the code network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(api.serverTime()).rejects.toMatchObject({ status: 0, code: 'network' })
  })

  it('uses the code unknown when an error body has none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 500 })))
    await expect(api.me()).rejects.toMatchObject({ status: 500, code: 'unknown' })
  })
})
