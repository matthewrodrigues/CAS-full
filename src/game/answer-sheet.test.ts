import { describe, expect, it } from 'vitest'
import { circledFor, parseWager, ringLeft, sheetButton, shouldNudge, sheetLine, tapOption } from './answer-sheet'

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

describe('sheetButton', () => {
  it('send when something is picked and nothing is sent', () => expect(sheetButton({ picked: 1, sent: null, hasInput: true })).toEqual({ isSent: false, label: 'send' }))
  it('a disabled send when nothing is picked and nothing is sent', () => expect(sheetButton({ picked: null, sent: null, hasInput: false })).toEqual({ isSent: false, label: 'send' }))
  it('send_instead when the pick differs from the sent answer', () => expect(sheetButton({ picked: 2, sent: 1, hasInput: true })).toEqual({ isSent: false, label: 'send_instead' }))
  it('no button once the pick is what the team sent', () => expect(sheetButton({ picked: 1, sent: 1, hasInput: true })).toEqual({ isSent: true, label: null }))
  it('no button when a teammate sent and nothing is picked here', () => expect(sheetButton({ picked: null, sent: 1, hasInput: false })).toEqual({ isSent: false, label: null }))
  it('typed text that does not parse still gets a button, so the error can say why', () => expect(sheetButton({ picked: null, sent: 1900, hasInput: true })).toEqual({ isSent: false, label: 'send_instead' }))
  it('works on typed values', () => expect(sheetButton({ picked: 'octopus', sent: 'squid', hasInput: true }).label).toBe('send_instead'))
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

describe('sheetLine', () => {
  const base = { type: 'mc' as const, mediaKind: 'none' as const, paused: false, readOnly: false, sent: false, nudging: false }
  it('asks per question type', () => {
    expect(sheetLine(base)).toBe('question.mc')
    expect(sheetLine({ ...base, type: 'true_false' })).toBe('question.true_false')
    expect(sheetLine({ ...base, type: 'typed' })).toBe('question.typed')
    expect(sheetLine({ ...base, type: 'closest_number' })).toBe('question.closest_number')
  })
  it('a picture or sound clip sets the line, whatever the type', () => {
    expect(sheetLine({ ...base, mediaKind: 'image' })).toBe('question.image')
    expect(sheetLine({ ...base, type: 'typed', mediaKind: 'audio' })).toBe('question.audio')
  })
  it('says got it once the team has sent', () => expect(sheetLine({ ...base, sent: true })).toBe('question.sent'))
  it('nudges before anything else live', () => expect(sheetLine({ ...base, nudging: true, sent: true })).toBe('question.nudge'))
  it('cheers the captain on for everyone else', () => expect(sheetLine({ ...base, readOnly: true, sent: true })).toBe('question.captainOnly'))
  it('takes a breather while paused', () => expect(sheetLine({ ...base, paused: true, nudging: true, readOnly: true })).toBe('question.paused'))
})

describe('parseWager', () => {
  it('accepts a whole number from 0 to the score', () => {
    expect(parseWager('0', 180)).toBe(0)
    expect(parseWager(' 100 ', 180)).toBe(100)
    expect(parseWager('180', 180)).toBe(180)
  })
  it('rejects more than the score, negatives, fractions and words', () => {
    expect(parseWager('181', 180)).toBeNull()
    expect(parseWager('-1', 180)).toBeNull()
    expect(parseWager('2.5', 180)).toBeNull()
    expect(parseWager('lots', 180)).toBeNull()
    expect(parseWager('', 180)).toBeNull()
  })
})

describe('ringLeft', () => {
  it('is the fraction of time left, kept between 0 and 1', () => {
    expect(ringLeft(10_000, 20_000)).toBe(0.5)
    expect(ringLeft(-5, 20_000)).toBe(0)
    expect(ringLeft(30_000, 20_000)).toBe(1)
    expect(ringLeft(1000, 0)).toBe(0)
  })
})
