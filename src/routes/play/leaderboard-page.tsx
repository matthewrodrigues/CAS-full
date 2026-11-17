import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { HostStage } from '@/components/host-stage'
import { LeaderboardList } from '@/components/leaderboard-list'
import { StatusPill } from '@/components/status-pill'
import { finishOf, isBigBoard, pillForPhase, showJumpRow } from '@/game/after-game'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { FieldError } from './field-error'
import { usePlay } from './context'
import { PrizeList } from './prize-list'

/**
 * The Leaderboard tab. A Tonight / Season switch (each view its own URL, `?view=season`) picks tonight's
 * teams (design/screens/leaderboard-tonight.html) or the season's players (leaderboard-season.html).
 */
export function LeaderboardPage() {
  const [params] = useSearchParams()
  return params.get('view') === 'season' ? <SeasonBoard /> : <TonightBoard />
}

const useSeason = (eventId: string) => useQuery({ queryKey: ['season-leaderboard', eventId], queryFn: () => api.seasonLeaderboard(eventId) })

/** The Tonight / Season switch (kit.md §6). Shown once the season is known. */
function ViewSwitch({ active, seasonName }: { active: 'tonight' | 'season'; seasonName: string | undefined }) {
  const { t } = useTranslation()
  if (!seasonName) return null
  return (
    <nav className="seg" aria-label={t('leaderboard.viewLabel')}>
      <Link className="seg__link" to="." aria-current={active === 'tonight' ? 'page' : undefined}>
        {t('leaderboard.tonight')}
      </Link>
      <Link className="seg__link" to="?view=season" aria-current={active === 'season' ? 'page' : undefined}>
        {t('leaderboard.seasonTab', { name: seasonName })}
      </Link>
    </nav>
  )
}

/**
 * Tonight's teams, your own marked, and the prize animal on each of the top 3. On a long board a
 * "You're 11th of 20" row jumps to your team. Before anyone has scored it shows the waiting stage and the prizes.
 */
function TonightBoard() {
  const { t } = useTranslation()
  const { eventId, joinCode, live } = usePlay()
  const id = useId()
  const view = live.view!
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const seasonName = useSeason(eventId).data?.season.name
  const rows = board.data?.teams ?? []
  const anyPoints = rows.some((row) => row.points !== 0)
  const ended = view.state.phase === 'ended'
  const prizeList = prizes.data?.prizes ?? []
  const finish = finishOf(rows, view.my_team?.id)
  const big = isBigBoard(rows.length)
  const jump = showJumpRow(finish?.rank)
  const ordinal = finish ? t('ended.nth', { count: finish.rank, ordinal: true }) : ''
  const scores = big ? t(ended ? 'leaderboard.finalCount' : 'leaderboard.sofarCount', { count: rows.length }) : t(ended ? 'leaderboard.final' : 'leaderboard.sofar')

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
          <HostStage host="rocco" expression="cheering" line={big ? t('host.lines.leaderboardCrowd', { count: rows.length }) : t('host.lines.leaderboardCheer')} tone="sky" />
          <ViewSwitch active="tonight" seasonName={seasonName} />
          <div className="stack stack--tight">
            <h1 className="h1">{t('leaderboard.title')}</h1>
            <p className="small muted">{[scores, prizeList.length ? t('leaderboard.prizeHint') : null].filter(Boolean).join(' ')}</p>
          </div>
          {jump && finish ? (
            <a className="list-row is-you" href="#you-row">
              <span className="list-row__rank">{finish.rank}</span>
              <span className="list-row__name">
                {t('leaderboard.jump', { ordinal, total: rows.length })}
                <span className="list-row__sub">{t('leaderboard.jumpSub', { team: view.my_team?.name, points: finish.points })}</span>
              </span>
              <span className="list-row__score">
                <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="m6 13 6 6 6-6" />
                </svg>
                <span className="sr-only">{t('leaderboard.jumpTo')}</span>
              </span>
            </a>
          ) : null}
          <LeaderboardList rows={rows} ownTeamId={view.my_team?.id} prizes={prizeList} label={t('leaderboard.title')} />
        </>
      ) : (
        <>
          <ViewSwitch active="tonight" seasonName={seasonName} />
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

/**
 * The season board: every player's points across the season, no animals. The season query carries a name,
 * points, rank and nights per player, but no team, so the mockup's "3 nights · team" line is just the nights.
 */
function SeasonBoard() {
  const { t } = useTranslation()
  const { eventId } = usePlay()
  const season = useSeason(eventId)
  const data = season.data
  const rows = data?.players ?? []
  const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <>
      <div className="screen__top">{data ? <p className="hand hand--sm">{t('leaderboard.seasonDates', { start: date(data.season.starts_on), end: date(data.season.ends_on) })}</p> : null}</div>
      {season.isPending ? (
        <p role="status" className="muted center">
          {t('play.loading')}
        </p>
      ) : null}
      {season.isError ? (
        <div role="alert">
          <FieldError>{t('leaderboard.seasonError')}</FieldError>
        </div>
      ) : null}
      {data ? (
        <>
          <HostStage host="rocco" expression="cheering" line={t('host.lines.leaderboardSeason')} tone="sky" />
          <ViewSwitch active="season" seasonName={data.season.name} />
          <div className="stack stack--tight">
            <h1 className="h1">{t('leaderboard.seasonTab', { name: data.season.name })}</h1>
            <p className="small muted">{t('leaderboard.seasonHint')}</p>
          </div>
          {rows.length === 0 ? (
            <section className="card">
              <h2 className="h2">{t('leaderboard.seasonEmptyTitle')}</h2>
              <p className="body">{t('leaderboard.seasonEmpty')}</p>
            </section>
          ) : (
            <ol className="list" aria-label={t('leaderboard.seasonTab', { name: data.season.name })}>
              {rows.map((row, i) => (
                <li key={i} className={['list-row', row.rank <= 3 ? 'is-top' : null, row.is_you ? 'is-you' : null].filter(Boolean).join(' ')} aria-current={row.is_you ? 'true' : undefined}>
                  <span className="list-row__rank">
                    <span className="sr-only">{t('leaderboard.rank')} </span>
                    {row.rank}
                  </span>
                  <span className="list-row__name">
                    {row.name}
                    {row.is_you ? (
                      <>
                        {' '}
                        <span className="tag">{t('leaderboard.you')}</span>
                      </>
                    ) : null}
                    <span className="list-row__sub">{t('leaderboard.nights', { count: row.nights })}</span>
                  </span>
                  <span className="list-row__score">
                    {row.points}
                    <span className="sr-only"> {t('leaderboard.pointsSr')}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </>
  )
}
