import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openDb } from '../db/client'
import { call, makeTestApp } from './helpers'

describe('server foundation', () => {
  it('GET /api/health returns ok', async () => {
    const { app } = makeTestApp()
    const res = await call(app, 'GET', '/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
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
