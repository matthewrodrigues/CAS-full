import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useParams } from 'react-router'
import type { JoinResult } from '../../../shared/game'
import { LiveRegion } from '@/components/live-region'
import { useLiveGame } from '@/game/use-live-game'
import { cn } from '@/lib/utils'
import type { PlayContext } from './context'
import { JoinScreen } from './join-screen'
import { useJoin } from './use-join'

/** /play/:joinCode — join first, then the live game with its Play, Leaderboard and Rewards tabs. */
export function PlayLayout() {
  const { joinCode = '' } = useParams()
  const join = useJoin(joinCode)

  if (join.status === 'loading') return <Loading />
  if (!join.result) return <JoinScreen error={join.error} joining={join.joining} onJoin={join.join} />
  return <JoinedLayout result={join.result} joinCode={joinCode} />
}

function Loading() {
  const { t } = useTranslation()
  return (
    <p role="status" className="mx-auto max-w-md px-4 py-16 text-center text-lg text-ink-muted">
      {t('play.loading')}
    </p>
  )
}

function JoinedLayout({ result, joinCode }: { result: JoinResult; joinCode: string }) {
  const { t } = useTranslation()
  const live = useLiveGame(result.event.id)

  const context: PlayContext = { eventId: result.event.id, joinCode, playerId: result.player.id, live }
  const tabs = [
    { to: '.', label: t('play.tabs.play'), end: true },
    { to: 'leaderboard', label: t('play.tabs.leaderboard'), end: false },
    { to: 'rewards', label: t('play.tabs.rewards'), end: false },
  ]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-brand-deep text-surface">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-3">
          <p className="font-heading text-lg font-semibold">{t('app.name')}</p>
          <p className="text-sm">{t('play.header', { joinCode: result.event.join_code })}</p>
        </div>
      </header>
      {live.view && live.reconnecting ? (
        <p role="status" className="bg-urgent px-4 py-2 text-center text-sm font-medium text-ink">
          {t('play.reconnecting')}
        </p>
      ) : null}
      <LiveRegion state={live.view?.state} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">{live.view ? <Outlet context={context} /> : <Loading />}</main>
      <nav aria-label={t('play.tabs.label')} className="border-t border-border bg-surface">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-14 items-center justify-center text-base font-medium text-ink-muted outline-offset-[-2px]',
                    isActive && 'border-t-4 border-brand text-ink',
                  )
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
