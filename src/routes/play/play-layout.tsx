import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useMatch, useParams, useSearchParams } from 'react-router'
import type { JoinResult } from '../../../shared/game'
import { LiveRegion } from '@/components/live-region'
import { showTabBar } from '@/game/tab-bar'
import { useLiveGame } from '@/game/use-live-game'
import type { PlayContext } from './context'
import { JoinScreen } from './join-screen'
import { useJoin } from './use-join'

/**
 * /play/:joinCode — join first, then the live game. The layout is the `.screen`; each screen owns
 * its own top row (`.screen__top`: StatusPill plus a hand note) and renders its parts as direct
 * children, so the kit tab bar can follow `.screen__actions` as the last child.
 */
export function PlayLayout() {
  const { joinCode = '' } = useParams()
  const join = useJoin(joinCode)

  if (join.status === 'loading')
    return (
      <main className="screen">
        <Loading />
      </main>
    )
  if (!join.result) return <JoinScreen error={join.error} joining={join.joining} onJoin={join.join} />
  return <JoinedLayout result={join.result} joinCode={joinCode} />
}

function Loading() {
  const { t } = useTranslation()
  return (
    <p role="status" className="muted center" style={{ paddingTop: 'var(--space-10)' }}>
      {t('play.loading')}
    </p>
  )
}

function JoinedLayout({ result, joinCode }: { result: JoinResult; joinCode: string }) {
  const { t } = useTranslation()
  const live = useLiveGame(result.event.id)
  const onPlayTab = useMatch('/play/:joinCode') !== null
  const [params] = useSearchParams()
  const view = live.view

  const context: PlayContext = {
    eventId: result.event.id,
    joinCode,
    playerId: result.player.id,
    nickname: result.player.nickname,
    themeName: result.event.theme.name,
    live,
  }
  const tabs = !!view && showTabBar({ onPlayTab, phase: view.state.phase, hasTeam: view.my_team !== null, switchingTeam: params.has('switch') })

  return (
    <main className="screen">
      {view && live.reconnecting ? (
        <p role="status" className="note">
          {t('play.reconnecting')}
        </p>
      ) : null}
      <LiveRegion state={view?.state} />
      {view ? <Outlet context={context} /> : <Loading />}
      {tabs ? <TabBar /> : null}
    </main>
  )
}

const icon = (children: ReactNode) => (
  <svg className="tabbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const TAB_ICONS = {
  play: icon(
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6" />
      <path d="M12 17h.01" />
    </>,
  ),
  leaderboard: icon(
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4" />
      <path d="M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4" />
      <path d="M8 20h8" />
    </>,
  ),
  rewards: icon(
    <>
      <rect x="3.5" y="8" width="17" height="5" rx="1.5" />
      <path d="M5.5 13v7h13v-7" />
      <path d="M12 8v12" />
      <path d="M12 8C10 4 6.5 4 6.5 6.3S12 8 12 8Zm0 0c2-4 5.5-4 5.5-1.7S12 8 12 8Z" />
    </>,
  ),
  animals: icon(
    <>
      <circle cx="6.5" cy="10.5" r="1.7" />
      <circle cx="10" cy="6.5" r="1.7" />
      <circle cx="14" cy="6.5" r="1.7" />
      <circle cx="17.5" cy="10.5" r="1.7" />
      <path d="M12 12.5c-3 0-5.5 3.4-5.5 5.3 0 1.4 1.1 2.2 2.5 2.2 1.3 0 1.9-.6 3-.6s1.7.6 3 .6c1.4 0 2.5-.8 2.5-2.2 0-1.9-2.5-5.3-5.5-5.3Z" />
    </>,
  ),
}

/**
 * The kit tab bar (kit.md §6): full bleed, the last child of the screen. It stays in the flow, as in
 * the mockups: pinned (sticky or fixed) it covers the screen's last button on a long lobby, and axe
 * fails that button's target size.
 */
function TabBar() {
  const { t } = useTranslation()
  const tabs = [
    { to: '.', key: 'play', end: true },
    { to: 'leaderboard', key: 'leaderboard', end: false },
    { to: 'rewards', key: 'rewards', end: false },
    { to: 'animals', key: 'animals', end: false },
  ] as const

  return (
    <nav className="tabbar" aria-label={t('play.tabs.label')}>
      <ul className="tabbar__list">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <NavLink to={tab.to} end={tab.end} className="tabbar__link">
              {TAB_ICONS[tab.key]}
              {t(`play.tabs.${tab.key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
