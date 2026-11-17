import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openDb } from '../db/client'
import { EnvSchema } from '../env'
import { call, makeTestApp } from './helpers'

describe('server foundation', () => {
  it('GET /api/health returns ok', async () => {
    const { app } = makeTestApp()
    const res = await call(app, 'GET', '/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('GET /api/app_config gives the public join address, or null to use the page origin', async () => {
    expect(await (await call(makeTestApp().app, 'GET', '/api/app_config')).json()).toEqual({ public_url: null })
    const { app } = makeTestApp({ publicUrl: 'https://trivia.example.org' })
    expect(await (await call(app, 'GET', '/api/app_config')).json()).toEqual({ public_url: 'https://trivia.example.org' })
  })

  it('PUBLIC_URL must be an http(s) URL and loses a trailing slash', () => {
    expect(EnvSchema.parse({ PUBLIC_URL: 'https://trivia.example.org/' }).PUBLIC_URL).toBe('https://trivia.example.org')
    expect(EnvSchema.parse({ PUBLIC_URL: '' }).PUBLIC_URL).toBeUndefined()
    expect(() => EnvSchema.parse({ PUBLIC_URL: 'javascript:alert(1)' })).toThrow()
  })

  it('opens SQLite with foreign keys on and WAL mode for files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nightlife-db-'))
    const db = openDb(join(dir, 'test.db'))
    try {
      expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1)
      expect(db.$client.pragma('journal_mode', { simple: true })).toBe('wal')
    } finally {
      db.$client.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
