import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { errorCode, errorMessage } from '../play/errors'

/**
 * The demo quickstart on the host console (DEMO1 only; the server refuses other events): an
 * Autopilot switch that runs the host steps, and "Restart demo", which asks once before it clears
 * everyone's teams and scores.
 */
export function DemoCard({ eventId, autopilot, refresh }: { eventId: string; autopilot: boolean; refresh(): void }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const toggle = useMutation({ mutationFn: (on: boolean) => api.demoAutopilot(eventId, on), onSettled: refresh })
  const restart = useMutation({
    mutationFn: () => api.demoRestart(eventId),
    onSuccess: () => setRestarted(true),
    onSettled: () => {
      setConfirming(false)
      refresh()
    },
  })
  const failed = toggle.error ?? restart.error
  const status = autopilot ? t('host.demo.autopilotOn') : restarted ? t('host.demo.restarted') : ''

  return (
    <section className="card" aria-labelledby="demo-title">
      <h2 id="demo-title" className="text-xl font-semibold text-ink">
        {t('host.demo.title')}
      </h2>
      <p className="text-base text-ink-muted">{t('host.demo.body')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={autopilot}
          className="btn btn--secondary"
          disabled={toggle.isPending}
          onClick={() => {
            setRestarted(false)
            toggle.mutate(!autopilot)
          }}
        >
          {t('host.demo.autopilot')}
          <span className="tag" aria-hidden="true">
            {autopilot ? t('host.demo.on') : t('host.demo.off')}
          </span>
        </button>
        {confirming ? null : (
          <button type="button" className="btn btn--secondary" onClick={() => setConfirming(true)}>
            {t('host.demo.restart')}
          </button>
        )}
      </div>
      {autopilot ? null : <p className="text-base text-ink-muted">{t('host.demo.autopilotHint')}</p>}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-base text-ink">{t('host.demo.restartConfirm')}</p>
          <button type="button" className="btn btn--secondary" disabled={restart.isPending} onClick={() => restart.mutate()}>
            {t('host.demo.restartYes')}
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setConfirming(false)}>
            {t('host.demo.restartNo')}
          </button>
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="text-base text-ink">
        {status}
      </p>
      {failed ? (
        <p role="alert" className="field__error">
          {errorMessage(errorCode(failed), t)}
        </p>
      ) : null}
    </section>
  )
}
