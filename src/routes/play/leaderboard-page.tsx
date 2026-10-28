import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LeaderboardList } from '@/components/leaderboard-list'
import { api } from '@/lib/api'
import { leaderboardKey } from '@/game/use-live-game'
import { usePlay } from './context'

/** The Leaderboard tab: tonight's teams, your own marked (docs/SPEC.md section 3). */
export function LeaderboardPage() {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const rows = board.data?.teams ?? []
  const anyPoints = rows.some((row) => row.points !== 0)

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('leaderboard.title')}</h1>
      {board.isPending ? (
        <p role="status" className="text-lg text-ink-muted">
          {t('play.loading')}
        </p>
      ) : anyPoints ? (
        <LeaderboardList rows={rows} ownTeamId={live.view?.my_team?.id} />
      ) : (
        <p className="rounded-lg bg-surface p-4 text-lg text-ink-muted">{t('leaderboard.empty')}</p>
      )}
    </section>
  )
}
