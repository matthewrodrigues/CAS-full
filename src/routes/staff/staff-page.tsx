import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import type { EventSettings } from '../../../shared/settings'
import { RoleGate } from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { errorCode, errorMessage } from '../play/errors'

/** /staff/*: redeem prize codes, see issued codes, change event settings, export the newsletter list. */
export function StaffPage() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/staff', label: t('staff.redeemTab'), end: true },
    { to: '/staff/codes', label: t('staff.awardsTab'), end: false },
    { to: '/staff/settings', label: t('staff.settingsTab'), end: false },
    { to: '/staff/newsletter', label: t('staff.newsletterTab'), end: false },
  ]
  return (
    <RoleGate role="staff">
      <div className="min-h-dvh">
        <header className="bg-brand-deep text-surface">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <p className="font-heading text-xl font-semibold">{t('staff.title')}</p>
          </div>
        </header>
        <nav aria-label={t('staff.nav')} className="border-b border-border bg-surface">
          <ul className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-2">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink to={tab.to} end={tab.end} className={({ isActive }) => cn('flex h-12 items-center px-3 text-base font-medium text-ink-muted', isActive && 'border-b-4 border-brand text-ink')}>
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </RoleGate>
  )
}

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> }

/** Type a code or scan its QR (barcode-detector covers iOS Safari). */
export function RedeemPage() {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [noCamera, setNoCamera] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const redeem = useMutation({ mutationFn: (value: string) => api.redeemCode(value), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-awards'] }) })

  useEffect(() => {
    if (!scanning) return
    let stream: MediaStream | null = null
    let stop = false
    void (async () => {
      try {
        const { BarcodeDetector } = await import('barcode-detector/ponyfill')
        const detector = new BarcodeDetector({ formats: ['qr_code'] }) as unknown as Detector
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!video.current) return
        video.current.srcObject = stream
        await video.current.play()
        while (!stop) {
          const [found] = await detector.detect(video.current)
          if (found?.rawValue) {
            setCode(found.rawValue)
            setScanning(false)
            redeem.mutate(found.rawValue)
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      } catch {
        setNoCamera(true)
        setScanning(false)
      }
    })()
    return () => {
      stop = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [scanning, redeem])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (code.trim()) redeem.mutate(code.trim())
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('staff.redeemTitle')}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <label htmlFor={id} className="text-base font-medium text-ink">
          {t('staff.code')}
        </label>
        <Input id={id} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" className="font-mono tracking-widest" />
        <Button type="submit" size="lg" disabled={redeem.isPending || !code.trim()}>
          {t('staff.redeem')}
        </Button>
      </form>
      <Button variant="outline" onClick={() => setScanning((s) => !s)}>
        {scanning ? t('staff.stopScan') : t('staff.scan')}
      </Button>
      {scanning ? <video ref={video} muted playsInline className="w-full rounded-lg bg-ink" /> : null}
      {noCamera ? <p className="text-base text-ink-muted">{t('staff.noCamera')}</p> : null}
      <div role="status">
        {redeem.isSuccess ? <p className="rounded-lg bg-correct p-4 text-lg font-semibold text-ink">{t('staff.redeemed', { reward: redeem.data.reward, nickname: redeem.data.nickname ?? '—' })}</p> : null}
      </div>
      {redeem.error ? (
        <p role="alert" className="rounded-lg bg-incorrect p-4 text-lg font-semibold text-surface">
          {errorMessage(errorCode(redeem.error), t)}
        </p>
      ) : null}
    </section>
  )
}

export function CodesPage() {
  const { t } = useTranslation()
  const awards = useQuery({ queryKey: ['staff-awards'], queryFn: api.staffAwards })
  const rows = awards.data?.awards ?? []
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('staff.awardsTitle')}</h1>
      {rows.length === 0 ? <p className="text-lg text-ink-muted">{t('staff.awardsEmpty')}</p> : null}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3">
            <span className="font-mono text-base text-ink">{t('staff.awardRow', { code: row.code, reward: row.reward, nickname: row.nickname ?? '—' })}</span>
            <span className="text-base font-medium text-ink">{t(`staff.status.${row.status}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const SELECTS = {
  team_submissions: ['any_member', 'captain_only'],
  speed_bonus: ['off', 'tiered'],
  live_background: ['cream', 'violet'],
} as const
const NUMBERS = ['max_team_size', 'grace_ms', 'auto_accept_threshold', 'review_threshold'] as const

/** The configurable items from SPEC section 2, per event. */
export function SettingsPage() {
  const { t } = useTranslation()
  const id = useId()
  const events = useQuery({ queryKey: ['host-events'], queryFn: api.hostEvents })
  const [eventId, setEventId] = useState('')
  const chosen = eventId || events.data?.events[0]?.id || ''
  const current = useQuery({ queryKey: ['settings', chosen], queryFn: () => api.staffEventSettings(chosen), enabled: !!chosen })
  const [draft, setDraft] = useState<Partial<EventSettings>>({})
  const save = useMutation({ mutationFn: () => api.staffUpdateSettings(chosen, draft), onSuccess: () => {
      setDraft({})
      void current.refetch()
    },
  })
  const value = { ...current.data?.settings, ...draft } as EventSettings

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate()
  }
  const issues = save.error instanceof ApiError && save.error.code === 'invalid_settings'

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('staff.settingsTitle')}</h1>
      <label htmlFor={`${id}-event`} className="text-base font-medium text-ink">
        {t('staff.event')}
      </label>
      <select id={`${id}-event`} value={chosen} onChange={(e) => {
          setEventId(e.target.value)
          setDraft({})
        }} className="h-12 rounded-lg border border-border bg-surface px-3 text-lg text-ink">
        {events.data?.events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.join_code} · {event.theme}
          </option>
        ))}
      </select>
      {current.data ? (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg bg-surface p-4" noValidate>
          {(Object.keys(SELECTS) as (keyof typeof SELECTS)[]).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${key}`} className="text-base font-medium text-ink">
                {t(`staff.fields.${key}`)}
              </label>
              <select id={`${id}-${key}`} value={value[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="h-12 rounded-lg border border-border bg-surface px-3 text-lg text-ink">
                {SELECTS[key].map((option) => (
                  <option key={option} value={option}>
                    {t(`staff.options.${option}`)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {NUMBERS.map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${key}`} className="text-base font-medium text-ink">
                {t(`staff.fields.${key}`)}
              </label>
              <Input id={`${id}-${key}`} inputMode="decimal" value={String(value[key])} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
            </div>
          ))}
          <Button type="submit" size="lg" disabled={save.isPending}>
            {t('staff.save')}
          </Button>
          <div role="status">{save.isSuccess ? <p className="text-lg text-ink">{t('staff.saved')}</p> : null}</div>
          {save.error ? (
            <p role="alert" className="text-base font-medium text-incorrect">
              {issues ? t('staff.invalid', { issues: '' }) : errorMessage(errorCode(save.error), t)}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}

export function NewsletterPage() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('staff.newsletterTitle')}</h1>
      <Button asChild size="lg" variant="outline">
        <a href="/api/staff_newsletter_csv" download>
          {t('staff.download')}
        </a>
      </Button>
    </section>
  )
}
