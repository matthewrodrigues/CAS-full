import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Host } from '../../../../shared/characters'
import type { LeaderboardRow, NamingPrize } from '../../../../shared/game'
import { Character, animalCharacter } from '@/components/character'
import { HostStage } from '@/components/host-stage'
import { BIG_PAGE_MS, BIG_PAGE_SIZE, bigExpression, pageRange, rotation } from '@/game/big-screen'
import { ROUND_BREAK_OUTGOING_EXPRESSION } from '@/game/cast'
import { useBoard, usePrizes, useRounds } from './data'
import { BigFrame } from './frame'
import type { PhaseProps } from './question'

/** The slide on show: one every BIG_PAGE_MS, so a long board reads in turn. The page flips instantly, so nothing moves for people who ask for less motion. */
function useSlide(count: number): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (count < 2) return
    const timer = setInterval(() => setTick((n) => n + 1), BIG_PAGE_MS)
    return () => clearInterval(timer)
  }, [count])
  return tick % Math.max(1, count)
}

/** Only the top 3 with points show the animal they would name (the server awards by rank, and only above zero). */
const prizeOf = (row: LeaderboardRow, prizes: NamingPrize[]) => (row.rank <= 3 && row.points > 0 ? prizes.find((p) => p.place === row.rank) : undefined)

/** The standings at a round break or the end (big-leaderboard), then the next host's intro or the prizes (big-round-intro, big-prizes). */
export function Standings({ view, paused }: PhaseProps) {
  const { t } = useTranslation()
  const ended = view.state.phase === 'ended' || view.state.paused_from_phase === 'ended'
  const rows = useBoard(view.event.id).data ?? []
  const prizes = usePrizes(view.event.id).data ?? []
  const rounds = useRounds(view.event.id).data
  const incoming = !ended ? view.cast.incoming_host : null
  const nextRound = rounds?.find((r) => !r.started)
  const finished = rounds?.filter((r) => r.started).at(-1)
  const winners = rows.filter((row) => prizeOf(row, prizes))
  const extra = ended ? (winners.length ? ('prizes' as const) : null) : incoming && nextRound ? ('intro' as const) : null
  const slides = rotation(rows.length, extra)
  const slide = slides[useSlide(slides.length)]!
  const code = view.event.join_code

  if (slide.kind === 'extra' && extra === 'intro' && incoming && nextRound) {
    const stage = (
      <HostStage host={incoming} expression="greeting" line={t('host.lines.bigIntro')} tone="butter" hero size={400} labelledBy="takeover">
        <h1 className="h1" id="takeover">
          {t('display.takeover', { host: t(`host.shortNames.${incoming}`), round: nextRound.position })}
        </h1>
      </HostStage>
    )
    return (
      <BigFrame pill={paused ? 'paused' : 'waiting'} note={t('display.introNote', { round: finished?.position ?? nextRound.position - 1, code })} stage={stage}>
        <article className="paper" aria-labelledby="round-title">
          <header className="paper__head">
            <div className="paper__meta">
              <p className="hand">{t('display.roundOf', { round: nextRound.position, rounds: rounds!.length })}</p>
            </div>
          </header>
          <div className="paper__body">
            <h2 className="display" id="round-title">
              {nextRound.title}
            </h2>
            <p className="h2 muted">{t('display.answerOnPhone')}</p>
            <div className="row row--wide">
              <HostCast host={view.cast.host} />
              <p className="bubble bubble--fit">{t('host.lines.bigHandOver', { host: t(`host.shortNames.${incoming}`) })}</p>
            </div>
          </div>
        </article>
      </BigFrame>
    )
  }

  if (slide.kind === 'extra' && extra === 'prizes') {
    const stage = (
      <HostStage host={view.cast.host} expression={bigExpression('ended')} line={t('host.lines.bigPrizes')} tone="sky" hero size={400}>
        <p className="body">{t('display.winners')}</p>
      </HostStage>
    )
    return (
      <BigFrame pill={paused ? 'paused' : 'results'} note={t('display.endedNote')} stage={stage}>
        <h1 className="h1" id="prizes-title">
          {t('display.prizes')}
        </h1>
        <ol className="list list--board" aria-labelledby="prizes-title">
          {winners.slice(0, 5).map((row) => {
            const prize = prizeOf(row, prizes)!
            return (
              <li key={row.team_id} className="list-row is-top">
                <span className="list-row__rank">{row.rank}</span>
                <Character name={animalCharacter(prize.animal.avatar, true)} size={96} label={prize.animal.species} />
                <span className="list-row__name">
                  {row.name ?? t('play.team.unnamed')}
                  <span className="list-row__sub">{t('display.names', { species: prize.animal.species })}</span>
                </span>
                <span className="list-row__score">
                  {row.points}
                  <span className="sr-only"> {t('leaderboard.points', { count: row.points })}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </BigFrame>
    )
  }

  const page = slide.kind === 'board' ? slide.page : 0
  const range = pageRange(rows.length, page)
  const shown = rows.slice(page * BIG_PAGE_SIZE, (page + 1) * BIG_PAGE_SIZE)
  const title = ended ? t('display.ended') : finished ? t('display.roundComplete', { round: finished.position }) : t('display.roundBreak')
  const stage = (
    <HostStage
      host={view.cast.host}
      expression={paused ? bigExpression('paused') : page > 0 ? 'waiting' : bigExpression('round_break')}
      line={paused ? t('host.lines.bigPaused') : page > 0 ? t('host.lines.bigBoardMore') : t('host.lines.bigBoard')}
      tone="sky"
      hero
      size={400}
      labelledBy="board-title"
    >
      <div className="stack stack--tight">
        <h1 className="h1" id="board-title">
          {title}
        </h1>
        <p className="body">{t('display.topTeams')}</p>
      </div>
    </HostStage>
  )

  return (
    <BigFrame pill={paused ? 'paused' : 'results'} note={t('display.boardNote', range)} stage={stage}>
      <ol className="list list--board" start={range.from} aria-labelledby="board-title">
        {shown.map((row) => {
          const prize = prizeOf(row, prizes)
          return (
            <li key={row.team_id} className={row.rank <= 3 ? 'list-row is-top' : 'list-row'}>
              <span className="list-row__rank">{row.rank}</span>
              {prize ? <Character name={animalCharacter(prize.animal.avatar)} size={96} /> : null}
              <span className="list-row__name">{row.name ?? t('play.team.unnamed')}</span>
              <span className="list-row__score">
                {row.points}
                <span className="sr-only"> {t('leaderboard.points', { count: row.points })}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </BigFrame>
  )
}

/** The outgoing host, relaxing, as the next one takes over. */
function HostCast({ host }: { host: Host }) {
  const { t } = useTranslation()
  return <Character name={`hosts/${host}/${ROUND_BREAK_OUTGOING_EXPRESSION}`} size={160} label={t('host.label', { name: t(`host.names.${host}`), expression: t(`host.expressions.${ROUND_BREAK_OUTGOING_EXPRESSION}`) })} />
}
