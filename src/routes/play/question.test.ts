import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { LiveQuestion, RevealPayload } from '../../../shared/game'
import { revealRows, roundNote } from './question'

const t = ((key: string) => (key === 'question.true' ? 'True' : key === 'question.false' ? 'False' : key)) as TFunction
const base = { event_question_id: 'q', round: { position: 1, title: 'R', format: 'standard' }, number: 1, of: 1, media_kind: 'none', media_url: null, caption: null, duration_s: 20, points: 10 }
const mc = { ...base, type: 'mc', prompt: 'p', options: ['Alpha', 'Bravo', 'Charlie', 'Delta'] } as LiveQuestion
const tf = { ...base, type: 'true_false', prompt: 'p', options: null } as LiveQuestion
const typed = { ...base, type: 'typed', prompt: 'p', options: null } as LiveQuestion
const reveal = (over: Record<string, unknown>) => ({ event_question_id: 'q', type: 'mc', correct_option: null, correct_text: null, numeric_answer: null, fun_fact: null, ...over }) as RevealPayload

describe('revealRows', () => {
  it('a correct pick shows one correct row, marked as ours', () => {
    expect(revealRows({ question: mc, reveal: reveal({ correct_option: 0 }), answer: { option: 0 }, result: 'correct', t })).toEqual([{ label: 'Alpha', kind: 'correct', mine: true }])
  })
  it('a wrong choice shows our pick and the right answer, in the options order', () => {
    expect(revealRows({ question: mc, reveal: reveal({ correct_option: 0 }), answer: { option: 2 }, result: 'incorrect', t })).toEqual([
      { label: 'Alpha', kind: 'correct', mine: false },
      { label: 'Charlie', kind: 'incorrect', mine: true },
    ])
  })
  it('true/false labels the rows True and False', () => {
    expect(revealRows({ question: tf, reveal: reveal({ type: 'true_false', correct_option: 1 }), answer: { option: 0 }, result: 'incorrect', t })).toEqual([
      { label: 'True', kind: 'incorrect', mine: true },
      { label: 'False', kind: 'correct', mine: false },
    ])
  })
  it('no answer shows just the right answer', () => {
    expect(revealRows({ question: mc, reveal: reveal({ correct_option: 3 }), answer: null, result: null, t })).toEqual([{ label: 'Delta', kind: 'correct', mine: false }])
  })
  it('a typed answer the host is still checking shows as neutral, above the right answer', () => {
    expect(revealRows({ question: typed, reveal: reveal({ type: 'typed', correct_text: 'Octopus' }), answer: { text: 'octopuss' }, result: 'review', t })).toEqual([
      { label: 'octopuss', kind: 'neutral', mine: true },
      { label: 'Octopus', kind: 'correct', mine: false },
    ])
  })
  it('a correct typed answer shows the accepted wording, as ours', () => {
    expect(revealRows({ question: typed, reveal: reveal({ type: 'typed', correct_text: 'Octopus' }), answer: { text: 'octopus' }, result: 'correct', t })).toEqual([{ label: 'Octopus', kind: 'correct', mine: true }])
  })
  it('a number is shown as typed', () => {
    const number = { ...typed, type: 'closest_number' } as LiveQuestion
    expect(revealRows({ question: number, reveal: reveal({ type: 'closest_number', numeric_answer: 1960 }), answer: { number: 1958 }, result: 'incorrect', t })).toEqual([
      { label: '1958', kind: 'incorrect', mine: true },
      { label: '1960', kind: 'correct', mine: false },
    ])
  })
  it('a skipped question has no rows', () => {
    expect(revealRows({ question: mc, reveal: { event_question_id: 'q', skipped: true }, answer: null, result: null, t })).toEqual([])
  })
})

describe('roundNote', () => {
  const tn = ((key: string, o?: { round: number; rounds: number }) => (o ? `${key} ${o.round}/${o.rounds}` : key)) as TFunction
  it('says which round of how many', () => {
    expect(roundNote(tn, { position: 2, title: 'R', format: 'standard' }, 4)).toBe('display.roundOf 2/4')
  })
  it('keeps "Final round" for the wager round', () => {
    expect(roundNote(tn, { position: 4, title: 'R', format: 'wager' }, 4)).toBe('wager.finalRound')
  })
})
