import type { Phase } from '../../shared/enums'

/** Phases whose Play screen shows the tab bar (kit.md §6, "Where the tab bar shows"). */
const TAB_BAR_PHASES: readonly Phase[] = ['lobby', 'round_break', 'ended']

/**
 * The tab bar shows on the lobby, the round break and every after-game screen. It's hidden while
 * joining (no team yet, or switching team from the lobby) and on every timed or in-flow sheet:
 * question, wager, locked, reveal, paused.
 * The other tabs (leaderboard, rewards, animals) always show it, so the player can get back to Play.
 */
export function showTabBar({ onPlayTab, phase, hasTeam, switchingTeam = false }: { onPlayTab: boolean; phase: Phase; hasTeam: boolean; switchingTeam?: boolean }): boolean {
  if (!onPlayTab) return true
  // A leftover ?switch=1 only matters in the lobby: switching is over once the game starts.
  if (switchingTeam && phase === 'lobby') return false
  return hasTeam && TAB_BAR_PHASES.includes(phase)
}
