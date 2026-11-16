// Pure rules for the room display (design/screens/big-*.html): how the standings page and which
// face the host makes. The components only draw what these return.
import type { Expression } from '../../shared/characters'
import type { Phase } from '../../shared/enums'

/** The big screen shows at most 8 rows at once (kit.md section 13) and pages through the rest. */
export const BIG_PAGE_SIZE = 8
export const BIG_PAGE_MS = 8000

export const boardPages = (total: number): number => Math.max(1, Math.ceil(total / BIG_PAGE_SIZE))

/** "Teams 1–8 of 20 · page 1 of 3", as numbers (`page` is 0-based in, 1-based out). */
export function pageRange(total: number, page: number) {
  const pages = boardPages(total)
  const index = Math.min(Math.max(page, 0), pages - 1)
  const from = index * BIG_PAGE_SIZE + 1
  return { from, to: Math.min(total, from + BIG_PAGE_SIZE - 1), total, page: index + 1, pages }
}

export type Slide = { kind: 'board'; page: number } | { kind: 'extra' }

/**
 * What the display cycles through, one slide per BIG_PAGE_MS: every standings page, then the
 * extra screen (the next host's intro at a round break, the prizes at the end) when there is one.
 */
export function rotation(rows: number, extra: 'intro' | 'prizes' | null): Slide[] {
  const slides: Slide[] = Array.from({ length: boardPages(rows) }, (_, page) => ({ kind: 'board', page }))
  return extra ? [...slides, { kind: 'extra' }] : slides
}

/** The host's face on the big screen. The room sees everyone, so it never consoles. */
export function bigExpression(phase: Phase): Expression {
  switch (phase) {
    case 'lobby':
      return 'greeting'
    case 'live':
    case 'final_live':
    case 'final_wager':
      return 'asking'
    case 'locked':
    case 'final_locked':
      return 'waiting'
    case 'paused':
      return 'relaxing'
    case 'revealed':
    case 'final_revealed':
    case 'round_break':
    case 'ended':
      return 'cheering'
  }
}
