import { describe, expect, it } from 'vitest'
import { BIG_PAGE_SIZE, bigExpression, boardPages, pageRange, rotation } from './big-screen'

describe('boardPages', () => {
  it('shows 8 rows a page', () => {
    expect(BIG_PAGE_SIZE).toBe(8)
    expect(boardPages(0)).toBe(1)
    expect(boardPages(8)).toBe(1)
    expect(boardPages(9)).toBe(2)
    expect(boardPages(20)).toBe(3)
  })
})

describe('pageRange', () => {
  it('numbers the teams on a page from 1', () => {
    expect(pageRange(20, 0)).toEqual({ from: 1, to: 8, total: 20, page: 1, pages: 3 })
    expect(pageRange(20, 2)).toEqual({ from: 17, to: 20, total: 20, page: 3, pages: 3 })
  })
})

describe('rotation', () => {
  it('pages through the board, then the intro or the prizes', () => {
    expect(rotation(20, 'intro')).toEqual([{ kind: 'board', page: 0 }, { kind: 'board', page: 1 }, { kind: 'board', page: 2 }, { kind: 'extra' }])
    expect(rotation(5, null)).toEqual([{ kind: 'board', page: 0 }])
  })
})

describe('bigExpression', () => {
  it('follows the phase', () => {
    expect(bigExpression('lobby')).toBe('greeting')
    expect(bigExpression('live')).toBe('asking')
    expect(bigExpression('final_locked')).toBe('waiting')
    expect(bigExpression('revealed')).toBe('cheering')
    expect(bigExpression('round_break')).toBe('cheering')
    expect(bigExpression('final_wager')).toBe('asking')
    expect(bigExpression('ended')).toBe('cheering')
    expect(bigExpression('paused')).toBe('relaxing')
  })
})
