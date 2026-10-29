import { describe, expect, it } from 'vitest'
import { backoffDelay } from './socket'

describe('backoffDelay', () => {
  it('starts at half a second and doubles, with jitter down to half', () => {
    expect(backoffDelay(0, () => 1)).toBe(500)
    expect(backoffDelay(3, () => 0)).toBe(2000)
    expect(backoffDelay(3, () => 1)).toBe(4000)
  })

  it('never waits more than 10 seconds', () => {
    expect(backoffDelay(20, () => 1)).toBe(10_000)
  })
})
