import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import type { HostTeam, ReviewItem } from '../../../shared/game'
import { Countdown } from '@/components/countdown'
import { LiveRegion } from '@/components/live-region'
import { RoleGate } from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiveGame } from '@/game/use-live-game'
import { api, type HostOperation } from '@/lib/api'
import { errorCode, errorMessage } from '../play/errors'
import { liveQuestion } from '../play/question'

/** /host/:eventId — run the night: one obvious next action, counts, review queue, teams. Placeholder layout. */
export function HostPage() {
  return (
    <RoleGate role="host">
      <Console />
    </RoleGate>
  )
}

const PRIMARY: Partial<Record<string, HostOperation>> = {
  lobby: 'host_next',
  live: 'host_lock',
  final_live: 'host_lock',
  locked: 'host_reveal',
  final_locked: 'host_reveal',
  revealed: 'host_next',
  round_break: 'host_next',
  final_wager: 'host_next',
  final_revealed: 'host_next',
  paused: 'host_resume',
}

function Console() {
  const { t } = useTranslation()
  const { eventId = '' } = useParams()
  const live = useLiveGame(eventId)
  const act = useMutation({ mutationFn: (operation: HostOperation) => api.hostAction(operation, eventId), onSettled: () => live.refresh() })
  const view = live.view
  if (!view?.host) return <p className="p-8 text-lg text-ink-muted">{t('play.loading')}</p>

  const { phase } = view.state
  const primary = PRIMARY[phase]
  const question = liveQuestion(view.state)
  const canSkip = ['live', 'locked', 'final_live', 'final_locked'].includes(phase)

  return (
    <div className="min-h-dvh">
      <header className="bg-brand-deep text-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="font-heading text-xl font-semibold">{t('host.header', { code: view.event.join_code })}</h1>
          <Link to={`/host/${eventId}/display`} target="_blank" className="text-base font-medium text-surface underline underline-offset-4">
            {t('host.display')}
          </Link>
        </div>
      </header>
      <LiveRegion state={view.state} />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        <section className="flex flex-col gap-4 rounded-xl bg-surface p-4" aria-label={t('host.title')}>
          <p className="text-base text-ink-muted">{t('host.phase', { phase })}</p>
          {question ? <h2 className="font-heading text-2xl font-semibold text-ink">{question.prompt}</h2> : null}
          {question ? <Countdown state={view.state} offset={live.offset} /> : null}
          <p className="text-lg text-ink" role="status">
            {phase === 'lobby'
              ? t('host.lobby', { count: view.host.teams.length })
              : t('host.answered', { answered: view.host.answered_teams, teams: view.host.teams.length, connected: view.host.connected_teams })}
          </p>
          {phase === 'ended' ? <p className="text-lg font-semibold text-ink">{t('host.ended')}</p> : null}
          <div className="flex flex-wrap gap-3">
            {primary ? (
              <Button size="lg" disabled={act.isPending} onClick={() => act.mutate(primary)}>
                {t(`host.primary.${phase as 'lobby'}`)}
              </Button>
            ) : null}
            {phase !== 'paused' && phase !== 'ended' ? (
              <Button size="lg" variant="outline" disabled={act.isPending} onClick={() => act.mutate('host_pause')}>
                {t('host.pause')}
              </Button>
            ) : null}
            {canSkip ? (
              <Button size="lg" variant="outline" disabled={act.isPending} onClick={() => act.mutate('host_skip')}>
                {t('host.skip')}
              </Button>
            ) : null}
          </div>
          {act.error ? (
            <p role="alert" className="text-base font-medium text-incorrect">
              {errorMessage(errorCode(act.error), t)}
            </p>
          ) : null}
        </section>
        <ReviewQueue items={view.host.review_queue} refresh={live.refresh} />
        <Teams teams={view.host.teams} refresh={live.refresh} />
      </main>
    </div>
  )
}

function ReviewQueue({ items, refresh }: { items: ReviewItem[]; refresh(): void }) {
  const { t } = useTranslation()
  const decide = useMutation({
    mutationFn: ({ id, result }: { id: string; result: 'correct' | 'incorrect' }) => api.override({ submission_id: id, result, note: t('host.reviewNote') }),
    onSettled: refresh,
  })
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-ink">{t('host.reviewTitle')}</h2>
      {items.length === 0 ? <p className="text-base text-ink-muted">{t('host.reviewEmpty')}</p> : null}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.submission_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-3">
            <span className="text-lg text-ink">{t('host.reviewItem', { team: item.team_name, answer: item.answer, percent: Math.round(item.similarity * 100) })}</span>
            <span className="flex gap-2">
              <Button variant="outline" aria-label={t('host.acceptLabel', { team: item.team_name })} disabled={decide.isPending} onClick={() => decide.mutate({ id: item.submission_id, result: 'correct' })}>
                {t('host.accept')}
              </Button>
              <Button variant="outline" aria-label={t('host.rejectLabel', { team: item.team_name })} disabled={decide.isPending} onClick={() => decide.mutate({ id: item.submission_id, result: 'incorrect' })}>
                {t('host.reject')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Teams({ teams, refresh }: { teams: HostTeam[]; refresh(): void }) {
  const { t } = useTranslation()
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => api.reviewTeamName({ team_id: id, name_status: status }),
    onSettled: refresh,
  })
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-ink">{t('host.teamsTitle')}</h2>
      {teams.length === 0 ? <p className="text-base text-ink-muted">{t('host.teamsEmpty')}</p> : null}
      <ul className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-col gap-3 rounded-lg bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-medium text-ink">{team.name}</span>
              <span className="text-base text-ink-muted">
                {t(`host.status.${team.name_status}`)} · {t('host.teamRow', { members: t('play.members', { count: team.member_count }), score: team.score })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.name_status !== 'approved' ? (
                <Button variant="outline" aria-label={t('host.approveLabel', { team: team.name })} onClick={() => review.mutate({ id: team.id, status: 'approved' })}>
                  {t('host.approve')}
                </Button>
              ) : null}
              {team.name_status !== 'rejected' ? (
                <Button variant="outline" aria-label={t('host.rejectNameLabel', { team: team.name })} onClick={() => review.mutate({ id: team.id, status: 'rejected' })}>
                  {t('host.rejectName')}
                </Button>
              ) : null}
            </div>
            <AdjustScore team={team} refresh={refresh} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function AdjustScore({ team, refresh }: { team: HostTeam; refresh(): void }) {
  const { t } = useTranslation()
  const id = useId()
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const adjust = useMutation({
    mutationFn: () => api.adjustScore({ team_id: team.id, points: Number(points), note: note.trim() }),
    onSuccess: () => {
      setPoints('')
      setNote('')
    },
    onSettled: refresh,
  })
  const valid = Number.isInteger(Number(points)) && Number(points) !== 0 && note.trim() !== ''
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) adjust.mutate()
  }
  return (
    <details>
      <summary className="cursor-pointer py-2 text-base font-medium text-ink">{t('host.adjustLabel', { team: team.name })}</summary>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 pt-2" noValidate>
        <div className="flex w-28 flex-col gap-1">
          <label htmlFor={`${id}-points`} className="text-sm font-medium text-ink">
            {t('host.adjustPoints')}
          </label>
          <Input id={`${id}-points`} value={points} onChange={(e) => setPoints(e.target.value)} inputMode="numeric" />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor={`${id}-note`} className="text-sm font-medium text-ink">
            {t('host.adjustNote')}
          </label>
          <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
        <Button type="submit" variant="outline" disabled={!valid || adjust.isPending}>
          {t('host.adjustApply')}
        </Button>
      </form>
    </details>
  )
}
