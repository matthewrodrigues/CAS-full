// Answer checking (docs/SPEC.md section 5) and the section 9 table tests. Similarities are
// hand-counted pg_trgm-style: each word padded as "  word ", shared ÷ distinct trigrams.
import { describe, expect, it } from 'vitest'
import { matchAnswer, normalizeAnswer, trigramSimilarity } from '../game/matching'

const thresholds = { autoAccept: 0.8, review: 0.5 }

describe('normalizeAnswer', () => {
  it.each([
    ['The Mitochondria', 'mitochondria'],
    ['  An   Octopus! ', 'octopus'],
    ['Octopuses', 'octopus'],
    ['Jellies', 'jelly'],
    ['Foxes', 'fox'],
    ['Anglerfish.', 'anglerfish'],
    ['Café', 'cafe'],
    ['T-Rex', 't rex'],
    ["Hades' realm", 'hade realm'],
    ['Glass', 'glass'],
    ['Nautilus', 'nautilus'],
    ['THE', 'the'],
    ['   ', ''],
  ])('%j → %j', (input, expected) => {
    expect(normalizeAnswer(input)).toBe(expected)
  })
})

describe('trigramSimilarity', () => {
  it('scores mitochondria vs mitochondrion as 11 shared of 16 distinct', () => {
    expect(trigramSimilarity('mitochondria', 'mitochondrion')).toBeCloseTo(11 / 16, 10)
  })

  it('scores mitochondria vs mitocondria as 10 shared of 15 distinct', () => {
    expect(trigramSimilarity('mitochondria', 'mitocondria')).toBeCloseTo(10 / 15, 10)
  })

  it('is 1 for identical strings and 0 for strings with no trigram in common', () => {
    expect(trigramSimilarity('giant squid', 'giant squid')).toBe(1)
    expect(trigramSimilarity('abc', 'xyz')).toBe(0)
  })

  it('is 0 for an empty string', () => {
    expect(trigramSimilarity('', 'squid')).toBe(0)
  })
})

describe('matchAnswer', () => {
  it.each([
    ['The Mitochondria', 'correct'],
    ['mitochondrion', 'review'],
    ['mitocondria', 'review'],
    ['banana', 'incorrect'],
    ['', 'incorrect'],
  ] as const)('%j against mitochondria → %s', (answer, result) => {
    expect(matchAnswer(answer, ['mitochondria'], thresholds).result).toBe(result)
  })

  it('reports similarity 1 for a normalized exact match', () => {
    expect(matchAnswer('OCTOPI.', ['octopi'], thresholds)).toEqual({ result: 'correct', similarity: 1 })
  })

  it('uses the best of several accepted answers', () => {
    const { result, similarity } = matchAnswer('mitocondria', ['powerhouse', 'mitochondria'], thresholds)
    expect(result).toBe('review')
    expect(similarity).toBeCloseTo(10 / 15, 10)
  })

  it('auto-accepts above the threshold', () => {
    // giant (6) + pacific (8) + octopu (7) vs giant + pacific + octopus (8): 20 shared of 23 distinct
    const { result, similarity } = matchAnswer('giant pacific octopu', ['giant pacific octopus'], thresholds)
    expect(result).toBe('correct')
    expect(similarity).toBeCloseTo(20 / 23, 10)
  })

  it('sends a near miss below the threshold to review', () => {
    // hadal (6) + zon (4) vs hadal + zone (5): 9 shared of 12 distinct = 0.75
    expect(matchAnswer('hadal zon', ['hadal zone'], thresholds)).toEqual({ result: 'review', similarity: 0.75 })
  })

  it('honors custom thresholds', () => {
    expect(matchAnswer('mitochondrion', ['mitochondria'], { autoAccept: 0.6, review: 0.3 }).result).toBe('correct')
    expect(matchAnswer('mitochondrion', ['mitochondria'], { autoAccept: 0.95, review: 0.9 }).result).toBe('incorrect')
  })
})
