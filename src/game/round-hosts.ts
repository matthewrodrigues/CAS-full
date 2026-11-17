import type { HostChoice } from '../../shared/characters'
import type { RoundHost } from '../../shared/game'

/** The round the lobby or a round break is about to hand over to: the first one that hasn't started. */
export function nextRoundToHost(rounds: RoundHost[]): RoundHost | null {
  return rounds.find((r) => !r.started) ?? null
}

/** Draft picks that differ from what's saved. Started rounds are never sent (the server would refuse them). */
export function changedChoices(rounds: RoundHost[], draft: Record<string, HostChoice>): { round_id: string; host_choice: HostChoice }[] {
  return rounds.filter((r) => !r.started && draft[r.round_id] && draft[r.round_id] !== r.host_choice).map((r) => ({ round_id: r.round_id, host_choice: draft[r.round_id]! }))
}
