import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Character, animalCharacter } from '@/components/character'
import { HostStage } from '@/components/host-stage'
import { StatusPill } from '@/components/status-pill'
import { finishOf, holdsPrizePlace, prizeRows } from '@/game/after-game'
import { hostExpression } from '@/game/cast'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { FeedbackScreen } from './after-game-forms'
import { usePlay } from './context'

/**
 * The end of the night (design/screens/ended-prizes.html): Rocco cheers or consoles by place, then the
 * place and the prize animals each top team names. The one next step is naming our animal, or the leaderboard.
 */
export function EndedScreen() {
  const [params] = useSearchParams()
  // ?feedback=1 is the feedback screen: Play stays the current tab, and Back returns here.
  return params.has('feedback') ? <FeedbackScreen /> : <EndedResults />
}

function EndedResults() {
  const { t } = useTranslation()
  const { eventId, joinCode, live } = usePlay()
  const id = useId()
  const view = live.view!
  const ownId = view.my_team?.id
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const rights = useQuery({ queryKey: ['naming-rights', true], queryFn: api.myNamingRights, staleTime: 0 })

  const top = (
    <div className="screen__top">
      <StatusPill status="results" />
      <p className="hand hand--sm">{t('play.gameCode', { code: joinCode })}</p>
    </div>
  )
  if (!board.data) {
    return (
      <>
        {top}
        <p role="status" className="muted center">
          {t('play.loading')}
        </p>
      </>
    )
  }

  const teams = board.data.teams
  const finish = finishOf(teams, ownId)
  const rank = finish?.rank ?? null
  const rows = prizeRows(teams, prizes.data?.prizes ?? [])
  const tiedForPrize = rows.some((row, i) => rows.findIndex((r) => r.team.rank === row.team.rank) !== i)
  // The win heading and cheer follow the prize rule: a 0-point top-3 team hasn't won.
  const won = finish !== null && holdsPrizePlace(finish)
  const ordinal = rank === null ? '' : t('ended.nth', { count: rank, ordinal: true })
  const heading = rank === null ? '' : t(finish!.tied ? (won ? 'ended.tiedWin' : 'ended.tied') : won ? 'ended.placeWin' : 'ended.place', { ordinal })
  const summary = !finish
    ? ''
    : finish.tied
      ? finish.tiedWith
        ? t('ended.summaryTied', { rank: finish.rank, points: finish.points, team: finish.tiedWith })
        : t('ended.summaryTiedUnnamed', { rank: finish.rank, points: finish.points })
      : t('ended.summary', { rank: finish.rank, points: finish.points })
  const line = !won ? t('host.lines.endedConsole') : finish!.tied ? t('host.lines.endedTie') : t('host.lines.endedCheer')

  const right = rights.data?.rights.find((r) => r.team_id === ownId)
  const next = right
    ? right.animal.name === null
      ? { to: 'rewards', label: t('ended.nameIt', { animal: t(`ended.animalNoun.${right.animal.avatar}`, { defaultValue: t('ended.animalFallback') }) }) }
      : { to: `animals/${right.animal.id}`, label: t('ended.showAnimal') }
    : { to: 'leaderboard', label: t('ended.board') }

  return (
    <>
      {top}

      {/* Rocco hosts the end of the night, cheering for a top-3 place and consoling otherwise. */}
      <HostStage host="rocco" expression={hostExpression(view, { place: won ? rank : null })} line={line} tone="sky" hero labelledBy={`${id}-place`}>
        <div className="stack stack--tight">
          <h1 className="display" id={`${id}-place`}>
            {heading}
          </h1>
          <p className="body">{summary}</p>
        </div>
      </HostStage>

      {rows.length ? (
        <section className="stack" aria-labelledby={`${id}-prizes`}>
          <div className="stack stack--tight">
            <h2 className="h2" id={`${id}-prizes`}>
              {t('naming.tonight')}
            </h2>
            <p className="small muted">{t(tiedForPrize ? 'ended.prizesTieBody' : 'ended.prizesBody')}</p>
          </div>
          <ol className="list" aria-labelledby={`${id}-prizes`}>
            {rows.map(({ team, animal }) => {
              const own = team.team_id === ownId
              return (
                <li key={team.team_id} className={own ? 'list-row is-top is-you' : 'list-row is-top'} aria-current={own ? 'true' : undefined}>
                  <span className="list-row__rank">
                    <span className="sr-only">{t('naming.placeSr')} </span>
                    {team.rank}
                  </span>
                  <Character name={animalCharacter(animal.avatar, true)} size={48} />
                  <span className="list-row__name">
                    {animal.species}
                    <span className="list-row__sub">
                      {team.name ?? t('play.team.unnamed')}
                      {own ? (
                        <>
                          {' '}
                          <span className="tag">{t('leaderboard.you')}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span className="list-row__score">
                    {team.points}
                    <span className="sr-only"> {t('leaderboard.pointsSr')}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      <div className="screen__actions">
        <Link className="btn btn--primary btn--block" to={next.to}>
          {next.label}
        </Link>
        <Link className="btn btn--quiet" to="?feedback=1">
          {t('ended.feedback')}
        </Link>
      </div>
    </>
  )
}
