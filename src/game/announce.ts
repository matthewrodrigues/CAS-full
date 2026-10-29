// What the aria-live region says when the game moves (docs/SPEC.md section 7): one short line per
// phase change, e.g. "Question 4 is live, 20 seconds". Countdown ticks are never announced.
import type { TFunction } from 'i18next'
import type { PublicGameState } from '../../shared/game'

const num = (payload: Record<string, unknown> | null, key: string): number | undefined => {
  const value = payload?.[key]
  return typeof value === 'number' ? value : undefined
}

export function announcement(previous: PublicGameState | null, next: PublicGameState, t: TFunction): string | null {
  // The first state is what the screen already shows on load; only changes are announced.
  if (!previous) return null
  const changed = previous.phase !== next.phase || previous.current_event_question_id !== next.current_event_question_id
  if (!changed) return null
  switch (next.phase) {
    case 'live':
    case 'final_live':
      return t('announce.live', { number: num(next.live_payload, 'number') ?? 1, seconds: num(next.live_payload, 'duration_s') ?? 0 })
    case 'locked':
    case 'final_locked':
      return t('announce.locked')
    case 'revealed':
    case 'final_revealed':
      return t('announce.revealed')
    case 'round_break': {
      const round = next.live_payload?.round ?? previous.live_payload?.round
      const position = round && typeof round === 'object' && 'position' in round ? Number(round.position) : 1
      return t('announce.roundBreak', { round: position })
    }
    case 'final_wager':
      return t('announce.finalWager')
    case 'paused':
      return t('announce.paused')
    case 'ended':
      return t('announce.ended')
    default:
      return null
  }
}
