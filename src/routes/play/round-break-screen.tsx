import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Character, hostCharacter } from '@/components/character'
import { HostStage } from '@/components/host-stage'
import { ROUND_BREAK_OUTGOING_EXPRESSION, hostExpression, hostLabel } from '@/game/cast'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { ScreenTop } from './paper-parts'

/**
 * Between rounds (design/screens/round-break.html): the incoming host greets the team on a butter
 * stage, and the paper shows where the team stands, with the outgoing host handing over, small.
 * The round numbers, titles, formats and question count come from view.rounds; whatever it doesn't
 * carry (no round after this one) is left out and the older wording stands in.
 */
export function RoundBreakScreen() {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const id = useId()
  const view = live.view!
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  const team = view.my_team!
  const own = board.data?.teams.find((row) => row.team_id === team.id)
  // The incoming host is the main character; the outgoing one hands over, small.
  const incoming = view.cast.incoming_host ?? view.cast.host
  const outgoing = view.cast.incoming_host ? view.cast.host : null
  const incomingName = t(`host.shortNames.${incoming}`)
  const { finished, next, total } = view.rounds

  return (
    <>
      <ScreenTop status="waiting" note={next ? t('display.roundOf', { round: next.position, rounds: total }) : view.event.join_code} />
      <HostStage host={incoming} expression={hostExpression(view)} line={t('host.lines.roundBreak')} tone="butter" hero labelledBy={`${id}-host`}>
        <div className="stack stack--tight">
          <h1 className="h1" id={`${id}-host`}>
            {next ? t('roundBreak.takingRound', { name: incomingName, round: next.position }) : t('roundBreak.taking', { name: incomingName })}
          </h1>
          {next ? (
            <>
              <p className="body">
                <strong>{next.title}</strong>
              </p>
              <p className="small muted">{t(`roundBreak.format.${next.format}`)}</p>
            </>
          ) : null}
        </div>
      </HostStage>

      <article className="paper" aria-labelledby={`${id}-summary`}>
        <header className="paper__head">
          <div className="paper__meta">
            <h2 className="hand" id={`${id}-summary`}>
              {finished ? t('roundBreak.titleDone', { round: finished.position }) : t('roundBreak.title')}
            </h2>
            {finished ? <p className="small">{t('roundBreak.doneMeta', { title: finished.title, questions: t('display.questionCount', { count: finished.question_count }) })}</p> : null}
          </div>
        </header>
        <div className="paper__body">
          <div className="stack stack--tight">
            <p className="body">
              <strong>{team.name}</strong>
            </p>
            {own && board.data ? (
              <p className="tally">
                <span className="tally__num">#{own.rank}</span>
                <span className="tally__label">{t('roundBreak.tally', { count: board.data.teams.length, points: t('question.points', { count: own.points }) })}</span>
              </p>
            ) : null}
          </div>
          {outgoing ? (
            <div className="row">
              <Character name={hostCharacter(outgoing, ROUND_BREAK_OUTGOING_EXPRESSION)} size={64} label={hostLabel(t, outgoing, ROUND_BREAK_OUTGOING_EXPRESSION)} />
              <p className="bubble bubble--fit">{t('host.lines.roundBreakOutgoing', { name: incomingName })}</p>
            </div>
          ) : null}
        </div>
      </article>

      <div className="screen__actions">
        <Link className="btn btn--quiet" to="leaderboard">
          {t('roundBreak.seeAll')}
        </Link>
        <p className="small muted center">{t('roundBreak.next')}</p>
      </div>
    </>
  )
}
