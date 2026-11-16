import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { HostStage } from '@/components/host-stage'
import { LeaderboardList } from '@/components/leaderboard-list'
import { StatusPill } from '@/components/status-pill'
import { pillForPhase } from '@/game/after-game'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { PrizeList } from './prize-list'

/**
 * The Leaderboard tab (design/screens/leaderboard-tonight.html): tonight's teams, your own marked, and the
 * prize animal on each of the top 3. Before anyone has scored it shows the waiting stage and the prizes.
 * The season board has no data source in the app yet, so there is no Tonight / Season switch.
 */
export function LeaderboardPage() {
  const { t } = useTranslation()
  const { eventId, joinCode, live } = usePlay()
  const id = useId()
  const view = live.view!
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const rows = board.data?.teams ?? []
  const anyPoints = rows.some((row) => row.points !== 0)
  const ended = view.state.phase === 'ended'
  const prizeList = prizes.data?.prizes ?? []

  return (
    <>
      <div className="screen__top">
        <StatusPill status={pillForPhase(view.state.phase)} />
        <p className="hand hand--sm">{t('play.gameCode', { code: joinCode })}</p>
      </div>

      {board.isPending ? (
        <p role="status" className="muted center">
          {t('play.loading')}
        </p>
      ) : anyPoints ? (
        <>
          <HostStage host="rocco" expression="cheering" line={t('host.lines.leaderboardCheer')} tone="sky" />
          <div className="stack stack--tight">
            <h1 className="h1">{t('leaderboard.title')}</h1>
            <p className="small muted">{[t(ended ? 'leaderboard.final' : 'leaderboard.sofar'), prizeList.length ? t('leaderboard.prizeHint') : null].filter(Boolean).join(' ')}</p>
          </div>
          <LeaderboardList rows={rows} ownTeamId={view.my_team?.id} prizes={prizeList} label={t('leaderboard.title')} />
        </>
      ) : (
        <>
          <HostStage host="rocco" expression="waiting" line={t('host.lines.leaderboardWaiting')} tone="butter" hero labelledBy={`${id}-empty`}>
            <div className="stack stack--tight">
              <h1 className="h1" id={`${id}-empty`}>
                {t('leaderboard.emptyTitle')}
              </h1>
              <p className="body">{t('leaderboard.empty')}</p>
            </div>
          </HostStage>
          <PrizeList eventId={eventId} />
          <div className="screen__actions">
            <Link className="btn btn--primary btn--block" to="..">
              {t('leaderboard.back')}
            </Link>
          </div>
        </>
      )}
    </>
  )
}
