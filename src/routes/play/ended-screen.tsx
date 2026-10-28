import { useQuery } from '@tanstack/react-query'
import { PartyPopper } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { StatusBanner } from '@/components/status-banner'
import { Button } from '@/components/ui/button'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { usePlay } from './context'

/** The end of the night: the team's final rank. */
export function EndedScreen() {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const own = board.data?.teams.find((row) => row.team_id === live.view?.my_team?.id)

  return (
    <section className="flex flex-col gap-4">
      <StatusBanner status="results">{t('play.status.results')}</StatusBanner>
      <div className="flex items-center gap-3">
        <PartyPopper aria-hidden className="size-8 text-brand-deep" />
        <h1 className="font-heading text-3xl font-semibold text-ink">{t('ended.title')}</h1>
      </div>
      {own ? <p className="text-xl text-ink">{t('ended.rank', { rank: own.rank, points: own.points })}</p> : null}
      <Button asChild size="lg">
        <Link to="leaderboard">{t('ended.board')}</Link>
      </Button>
    </section>
  )
}
