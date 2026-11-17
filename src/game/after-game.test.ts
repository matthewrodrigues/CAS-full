import { describe, expect, it } from 'vitest'
import { PHASES } from '../../shared/enums'
import type { AnimalInfo, LeaderboardRow, NamingPrize } from '../../shared/game'
import { isBigBoard, finishOf, holdsPrizePlace, pillForPhase, prizeAnimal, prizeRows, showJumpRow } from './after-game'

const row = (team_id: string, rank: number, points: number, name: string | null = team_id): LeaderboardRow => ({ team_id, name, points, rank })
const animal = (species: string): AnimalInfo => ({
  id: species,
  species,
  scientific_name: null,
  exhibit: 'Somewhere',
  about: null,
  image_url: null,
  avatar: 'mystery',
  name: null,
  named_at: null,
  named_by_team: null,
})
const prizes: NamingPrize[] = [
  { place: 1, animal: animal('penguin') },
  { place: 2, animal: animal('octopus') },
  { place: 3, animal: animal('seahorse') },
]

describe('holdsPrizePlace', () => {
  it('is a top-three rank with points above zero, like the server', () => {
    expect(holdsPrizePlace({ rank: 1, points: 1 })).toBe(true)
    expect(holdsPrizePlace({ rank: 3, points: 9 })).toBe(true)
    expect(holdsPrizePlace({ rank: 4, points: 9 })).toBe(false)
    expect(holdsPrizePlace({ rank: 1, points: 0 })).toBe(false)
  })
})

describe('prizeAnimal', () => {
  it('gives the top three ranks their animal and nobody else', () => {
    expect(prizeAnimal({ rank: 1, points: 5 }, prizes)?.species).toBe('penguin')
    expect(prizeAnimal({ rank: 3, points: 5 }, prizes)?.species).toBe('seahorse')
    expect(prizeAnimal({ rank: 4, points: 5 }, prizes)).toBeNull()
  })
  it('is null for a top-three team with no points', () => {
    expect(prizeAnimal({ rank: 1, points: 0 }, prizes)).toBeNull()
  })
  it('is null when the night has no prize for that place', () => {
    expect(prizeAnimal({ rank: 2, points: 5 }, [prizes[0]])).toBeNull()
  })
})

describe('prizeRows', () => {
  it('lists the teams in the top three with their prize animal', () => {
    const teams = [row('a', 1, 10), row('b', 2, 9), row('c', 3, 8), row('d', 4, 7)]
    expect(prizeRows(teams, prizes).map((r) => [r.team.team_id, r.animal.species])).toEqual([
      ['a', 'penguin'],
      ['b', 'octopus'],
      ['c', 'seahorse'],
    ])
  })
  it('shows a tie for a place on both teams, and skips the ranks the tie swallows', () => {
    const teams = [row('a', 1, 10), row('b', 2, 9), row('c', 2, 9), row('d', 4, 7)]
    expect(prizeRows(teams, prizes).map((r) => [r.team.team_id, r.animal.species])).toEqual([
      ['a', 'penguin'],
      ['b', 'octopus'],
      ['c', 'octopus'],
    ])
  })
  it('gives no row to a 0-point team in the top three', () => {
    const teams = [row('a', 1, 4), row('b', 2, 0), row('c', 2, 0)]
    expect(prizeRows(teams, prizes).map((r) => r.team.team_id)).toEqual(['a'])
  })
  it('is empty without prizes', () => {
    expect(prizeRows([row('a', 1, 1)], [])).toEqual([])
  })
})

describe('finishOf', () => {
  it('is null for a team that is not on the board', () => {
    expect(finishOf([row('a', 1, 5)], 'z')).toBeNull()
    expect(finishOf([row('a', 1, 5)], undefined)).toBeNull()
  })
  it('reports rank and points, not tied', () => {
    expect(finishOf([row('a', 1, 5), row('b', 2, 4)], 'b')).toEqual({ rank: 2, points: 4, tied: false, tiedWith: null })
  })
  it('names a team you tie with', () => {
    expect(finishOf([row('a', 1, 5), row('b', 2, 4, 'Bees'), row('c', 2, 4, 'Cats')], 'c')).toEqual({ rank: 2, points: 4, tied: true, tiedWith: 'Bees' })
  })
  it('has no name to show when the tied team has none', () => {
    expect(finishOf([row('a', 1, 5, null), row('b', 1, 5, 'Bees')], 'b')).toEqual({ rank: 1, points: 5, tied: true, tiedWith: null })
  })
})

describe('pillForPhase', () => {
  it('maps every phase to one of the fixed status words', () => {
    for (const phase of PHASES) expect(['waiting', 'live', 'locked', 'results', 'paused', 'wager']).toContain(pillForPhase(phase))
  })
  it('reads the end and the breaks as results', () => {
    expect(pillForPhase('ended')).toBe('results')
    expect(pillForPhase('round_break')).toBe('results')
    expect(pillForPhase('lobby')).toBe('waiting')
    expect(pillForPhase('final_wager')).toBe('wager')
  })
})

describe('showJumpRow', () => {
  it('shows only when your rank is past the first screenful (rank 9 and below)', () => {
    expect(showJumpRow(8)).toBe(false)
    expect(showJumpRow(9)).toBe(true)
    expect(showJumpRow(11)).toBe(true)
  })
  it('is off without a rank', () => {
    expect(showJumpRow(null)).toBe(false)
    expect(showJumpRow(undefined)).toBe(false)
  })
})

describe('isBigBoard', () => {
  it('starts at 12 teams', () => {
    expect(isBigBoard(11)).toBe(false)
    expect(isBigBoard(12)).toBe(true)
    expect(isBigBoard(20)).toBe(true)
  })
})
