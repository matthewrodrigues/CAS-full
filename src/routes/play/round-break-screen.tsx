import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LeaderboardList } from '@/components/leaderboard-list'
import { StatusBanner } from '@/components/status-banner'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { usePlay } from './context'

/** Between rounds: where the team stands, and the top five. */
export function RoundBreakScreen() {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const ownId = live.view?.my_team?.id
  const own = board.data?.teams.find((row) => row.team_id === ownId)

  return (
    <section className="flex flex-col gap-4">
      <StatusBanner status="results">{t('play.status.results')}</StatusBanner>
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('roundBreak.title')}</h1>
      {own ? <p className="text-xl text-ink">{t('roundBreak.rank', { rank: own.rank, points: own.points })}</p> : null}
      {board.data ? (
        <>
          <h2 className="text-xl font-semibold text-ink">{t('roundBreak.top')}</h2>
          <LeaderboardList rows={board.data.teams} ownTeamId={ownId} limit={5} />
        </>
      ) : null}
      <p className="text-base text-ink-muted">{t('roundBreak.next')}</p>
    </section>
  )
}
