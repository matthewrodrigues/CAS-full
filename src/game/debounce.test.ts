import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from './debounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('debounce', () => {
  it('fires once, 500 ms after the last call, with its arguments', () => {
    const fn = vi.fn()
    const save = debounce(fn, 500)
    save('o')
    vi.advanceTimersByTime(300)
    save('oc')
    vi.advanceTimersByTime(499)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledExactlyOnceWith('oc')
  })

  it('flushes a pending call at once', () => {
    const fn = vi.fn()
    const save = debounce(fn, 500)
    save('octopus')
    save.flush()
    expect(fn).toHaveBeenCalledExactlyOnceWith('octopus')
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('drops a pending call on cancel', () => {
    const fn = vi.fn()
    const save = debounce(fn, 500)
    save('x')
    save.cancel()
    vi.advanceTimersByTime(1000)
    save.flush()
    expect(fn).not.toHaveBeenCalled()
  })
})
