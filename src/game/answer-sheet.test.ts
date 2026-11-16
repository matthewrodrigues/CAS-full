import { describe, expect, it } from 'vitest'
import { circledFor, sendLabel, shouldNudge, tapOption } from './answer-sheet'

describe('shouldNudge', () => {
  const base = { circled: 1, sent: null, msLeft: 5000, locked: false }
  it('nudges at 5 s with an unsent circle', () => expect(shouldNudge(base)).toBe(true))
  it('not at 5.1 s', () => expect(shouldNudge({ ...base, msLeft: 5100 })).toBe(false))
  it('not when the circle is the sent answer', () => expect(shouldNudge({ ...base, sent: 1 })).toBe(false))
  it('nudges when the circle differs from the sent answer', () => expect(shouldNudge({ ...base, sent: 2 })).toBe(true))
  it('not after the lock', () => expect(shouldNudge({ ...base, locked: true })).toBe(false))
  it('not when time has run out', () => expect(shouldNudge({ ...base, msLeft: 0 })).toBe(false))
  it('not with nothing circled', () => expect(shouldNudge({ ...base, circled: null })).toBe(false))
})

describe('sendLabel', () => {
  it('send when something is circled and nothing is sent', () => expect(sendLabel(1, null)).toBe('send'))
  it('send_instead when the circle differs from the sent answer', () => expect(sendLabel(2, 1)).toBe('send_instead'))
  it('null when they match', () => expect(sendLabel(1, 1)).toBe(null))
  it('null with nothing circled', () => expect(sendLabel(null, null)).toBe(null))
  it('works on typed values', () => expect(sendLabel('octopus', 'squid')).toBe('send_instead'))
})

describe('the circle', () => {
  it('a tap circles an option for that question', () => {
    expect(circledFor(tapOption('q1', 1), 'q1')).toBe(1)
  })
  it('belongs to its question only', () => {
    expect(circledFor(tapOption('q1', 1), 'q2')).toBe(null)
  })
  it('a later tap moves the circle', () => {
    expect(circledFor(tapOption('q1', 2), 'q1')).toBe(2)
  })
  it('nothing circled yet', () => {
    expect(circledFor(null, 'q1')).toBe(null)
  })
})
