// Which face the host makes on a phone screen, from the game view alone (docs/superpowers specs,
// "hostExpression" table). Pure, so every screen and the tests agree on it.
import type { TFunction } from 'i18next'
import type { Expression, Host } from '../../shared/characters'
import type { GameView } from '../../shared/game'

/**
 * In `round_break` two hosts can be on screen: the incoming host (the next round's) and the
 * outgoing one. `hostExpression` returns the expression for the MAIN host on screen, which is the
 * incoming host, so `greeting`. Draw the outgoing host with this constant.
 */
export const ROUND_BREAK_OUTGOING_EXPRESSION: Expression = 'relaxing'

/** True when my team has sent (not just circled) an answer for the question that is open now. */
function sentForCurrent(view: GameView): boolean {
  const s = view.submission
  return s !== null && !s.is_draft && s.answer !== null && s.event_question_id === view.state.current_event_question_id
}

/**
 * The main host's expression for this view.
 *
 * `ended` needs my team's final place, which `GameView` doesn't carry (it comes from the
 * leaderboard), so pass it as `context.place`. While it's unknown the host consoles, the table's
 * "otherwise" branch.
 */
export function hostExpression(view: GameView, context: { place?: number | null } = {}): Expression {
  switch (view.state.phase) {
    case 'lobby':
      return 'greeting'
    case 'live':
    case 'final_live':
      return sentForCurrent(view) ? 'waiting' : 'asking'
    case 'locked':
    case 'final_locked':
      return 'waiting'
    case 'revealed':
    case 'final_revealed': {
      const result = view.submission?.result
      if (result === 'correct') return 'cheering'
      if (result === 'incorrect') return 'consoling'
      return 'waiting' // no submission, or a typed answer still in host review
    }
    case 'round_break':
      return 'greeting' // the incoming host; see ROUND_BREAK_OUTGOING_EXPRESSION
    case 'paused':
      return 'relaxing'
    case 'final_wager':
      return 'asking'
    case 'ended': {
      const place = context.place
      return place != null && place >= 1 && place <= 3 ? 'cheering' : 'consoling'
    }
  }
}

/** A host's accessible name, e.g. "Rocco the raccoon, waving hello". */
export function hostLabel(t: TFunction, host: Host, expression: Expression): string {
  return t('host.label', { name: t(`host.names.${host}`), expression: t(`host.expressions.${expression}`) })
}

/** A player's or team's initial for its `.initial` bubble; "?" when the name is hidden. */
export const initialOf = (name: string | null): string => (name ? (Array.from(name.trim())[0]?.toUpperCase() ?? '?') : '?')
