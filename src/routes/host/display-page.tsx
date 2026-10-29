import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import type { GameView } from '../../../shared/game'
import { Countdown } from '@/components/countdown'
import { LeaderboardList } from '@/components/leaderboard-list'
import { RoleGate } from '@/components/role-gate'
import { leaderboardKey, useLiveGame } from '@/game/use-live-game'
import { api } from '@/lib/api'
import { choiceOptions, liveQuestion, revealPayload, trueFalse } from '../play/question'
import { QuestionMedia } from '../play/question-media'

/** /host/:eventId/display — the projector, read-only, in a host session. Placeholder layout. */
export function DisplayPage() {
  return (
    <RoleGate role="host">
      <Display />
    </RoleGate>
  )
}

function Display() {
  const { t } = useTranslation()
  const { eventId = '' } = useParams()
  const live = useLiveGame(eventId)
  const view = live.view
  if (!view) return null
  const phase = view.state.phase === 'paused' ? view.state.paused_from_phase : view.state.phase

  return (
    <main className="flex min-h-dvh flex-col gap-8 bg-brand-deep p-8 text-surface">
      {view.state.phase === 'paused' ? <p className="self-start rounded-full bg-surface px-4 py-1 text-xl font-semibold text-ink">{t('display.paused')}</p> : null}
      {phase === 'lobby' ? <Lobby view={view} /> : null}
      {phase === 'live' || phase === 'final_live' || phase === 'locked' || phase === 'final_locked' ? <Question view={view} offset={live.offset} /> : null}
      {phase === 'revealed' || phase === 'final_revealed' ? <Reveal view={view} /> : null}
      {phase === 'final_wager' ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-heading text-6xl font-semibold">{t('display.wager')}</h1>
          <p className="text-3xl">{t('display.wagerBody')}</p>
        </section>
      ) : null}
      {phase === 'round_break' || phase === 'ended' ? <Standings eventId={eventId} title={phase === 'ended' ? t('display.ended') : t('display.roundBreak')} /> : null}
    </main>
  )
}

function Lobby({ view }: { view: GameView }) {
  const { t } = useTranslation()
  const url = `${location.origin}/play/${view.event.join_code}`
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    void QRCode.toDataURL(url, { margin: 1, width: 360 }).then(setQr)
  }, [url])
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-heading text-6xl font-semibold">{t('display.join')}</h1>
      {qr ? <img src={qr} alt={t('display.qr')} className="size-80 rounded-xl bg-surface p-3" /> : null}
      <p className="text-3xl">
        {t('display.scan')} <span className="font-semibold">{url.replace(/^https?:\/\//, '')}</span>
      </p>
      <p className="text-5xl font-bold tracking-widest">{t('display.code', { code: view.event.join_code })}</p>
      <p className="text-2xl">{t('display.teams', { count: view.teams.length })}</p>
    </section>
  )
}

function Question({ view, offset }: { view: GameView; offset: number }) {
  const { t } = useTranslation()
  const question = liveQuestion(view.state)
  if (!question) return null
  const locked = view.state.phase === 'locked' || view.state.phase === 'final_locked'
  const options = question.type === 'mc' || question.type === 'true_false' ? choiceOptions(question, t) : []
  return (
    <section className="flex flex-col gap-6">
      <p className="text-2xl text-info-soft">{t('question.meta', { round: question.round.title, number: question.number, of: question.of })}</p>
      <h1 className="font-heading text-5xl leading-tight font-semibold">{question.prompt}</h1>
      <div className="max-w-3xl">
        <QuestionMedia question={question} muted="text-2xl text-info-soft" />
      </div>
      {options.length ? (
        <ol className="grid grid-cols-2 gap-4">
          {options.map((option, i) => (
            <li key={option} className="rounded-xl bg-surface p-5 text-3xl font-medium text-ink">
              {String.fromCharCode(65 + i)}. {option}
            </li>
          ))}
        </ol>
      ) : null}
      {locked ? <p className="text-4xl font-semibold">{t('display.locked')}</p> : <Countdown state={view.state} offset={offset} />}
    </section>
  )
}

function Reveal({ view }: { view: GameView }) {
  const { t } = useTranslation()
  const reveal = revealPayload(view.state)
  const question = liveQuestion(view.state)
  if (!reveal) return null
  if ('skipped' in reveal) return <h1 className="font-heading text-6xl font-semibold">{t('display.skipped')}</h1>
  const answer =
    reveal.type === 'mc' && reveal.correct_option !== null ? question?.options?.[reveal.correct_option]
    : reveal.type === 'true_false' && reveal.correct_option !== null ? trueFalse(t)[reveal.correct_option]
    : reveal.type === 'closest_number' ? String(reveal.numeric_answer)
    : reveal.correct_text
  return (
    <section className="flex flex-col gap-6">
      {question ? <p className="text-3xl text-info-soft">{question.prompt}</p> : null}
      <h1 className="font-heading text-6xl font-semibold">{t('display.answer', { answer })}</h1>
      {reveal.fun_fact ? (
        <div className="rounded-xl bg-surface p-6 text-ink">
          <h2 className="text-2xl font-semibold">{t('display.funFact')}</h2>
          <p className="text-3xl">{reveal.fun_fact}</p>
        </div>
      ) : null}
    </section>
  )
}

function Standings({ eventId, title }: { eventId: string; title: string }) {
  const { t } = useTranslation()
  const board = useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId) })
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-6xl font-semibold">{title}</h1>
      <h2 className="text-3xl">{t('display.top')}</h2>
      {board.data ? <LeaderboardList rows={board.data.teams} limit={5} /> : null}
    </section>
  )
}
