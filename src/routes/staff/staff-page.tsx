import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { ANIMAL_AVATARS, HOST_CHOICES_SHOWN, type AnimalAvatar, type HostChoice } from '../../../shared/characters'
import type { RoundHost, StaffAnimal, StaffNamingRight } from '../../../shared/game'
import type { EventSettings } from '../../../shared/settings'
import { Character, animalCharacter, hostCharacter } from '@/components/character'
import { RoleGate } from '@/components/role-gate'
import { changedChoices } from '@/game/round-hosts'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { errorCode, errorMessage } from '../play/errors'

/** /staff/*: redeem prize codes, see issued codes, change event settings, export the newsletter list. */
export function StaffPage() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/staff', label: t('staff.redeemTab'), end: true },
    { to: '/staff/animals', label: t('staff.animalsTab'), end: false },
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
      <h1 className="h1">{t('staff.redeemTitle')}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <label htmlFor={id} className="field__label">
          {t('staff.code')}
        </label>
        <input id={id} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" className="field__input font-mono tracking-widest" />
        <button type="submit" className="btn btn--primary" disabled={redeem.isPending || !code.trim()}>
          {t('staff.redeem')}
        </button>
      </form>
      <button type="button" className="btn btn--secondary" onClick={() => setScanning((s) => !s)}>
        {scanning ? t('staff.stopScan') : t('staff.scan')}
      </button>
      {scanning ? <video ref={video} muted playsInline className="w-full rounded-lg bg-ink" /> : null}
      {noCamera ? <p className="muted">{t('staff.noCamera')}</p> : null}
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
      <h1 className="h1">{t('staff.awardsTitle')}</h1>
      {rows.length === 0 ? <p className="muted">{t('staff.awardsEmpty')}</p> : null}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className="card flex-row flex-wrap items-center justify-between">
            <span className="font-mono text-base text-ink">{t('staff.awardRow', { code: row.code, reward: row.reward, nickname: row.nickname ?? '—' })}</span>
            <span className="field__label">{t(`staff.status.${row.status}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const SELECTS = {
  team_submissions: ['any_member', 'captain_only'],
  speed_bonus: ['off', 'tiered'],
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
      <h1 className="h1">{t('staff.settingsTitle')}</h1>
      <label htmlFor={`${id}-event`} className="field__label">
        {t('staff.event')}
      </label>
      <span className="select"><select id={`${id}-event`} value={chosen} onChange={(e) => {
          setEventId(e.target.value)
          setDraft({})
        }} className="field__select">
        {events.data?.events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.join_code} · {event.theme}
          </option>
        ))}
      </select></span>
      {current.data ? (
        <form onSubmit={submit} className="card" noValidate>
          {(Object.keys(SELECTS) as (keyof typeof SELECTS)[]).map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${key}`} className="field__label">
                {t(`staff.fields.${key}`)}
              </label>
              <span className="select"><select id={`${id}-${key}`} value={value[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="field__select">
                {SELECTS[key].map((option) => (
                  <option key={option} value={option}>
                    {t(`staff.options.${option}`)}
                  </option>
                ))}
              </select></span>
            </div>
          ))}
          {NUMBERS.map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${key}`} className="field__label">
                {t(`staff.fields.${key}`)}
              </label>
              <input className="field__input" id={`${id}-${key}`} inputMode="decimal" value={String(value[key])} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
            </div>
          ))}
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {t('staff.save')}
          </button>
          <div role="status">{save.isSuccess ? <p className="note">{t('staff.saved')}</p> : null}</div>
          {save.error ? (
            <p role="alert" className="field__error">
              {issues ? t('staff.invalid', { issues: '' }) : errorMessage(errorCode(save.error), t)}
            </p>
          ) : null}
        </form>
      ) : null}
      {chosen ? <RoundHosts key={chosen} eventId={chosen} /> : null}
    </section>
  )
}

const SHUFFLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l6 6" />
    <path d="M4 4l5 5" />
  </svg>
)

/** Who hosts each round (design/screens/staff-round-hosts.html). Rounds that have started are locked and show their host. */
function RoundHosts({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const key = ['round-hosts', eventId]
  const data = useQuery({ queryKey: key, queryFn: () => api.roundHosts(eventId) })
  const rounds: RoundHost[] = data.data?.rounds ?? []
  const [draft, setDraft] = useState<Record<string, HostChoice>>({})
  const save = useMutation({
    mutationFn: async () => {
      for (const change of changedChoices(rounds, draft)) await api.setRoundHost({ event_id: eventId, ...change })
    },
    onSuccess: () => setDraft({}),
    // A 409 means another session started a round: reload so it shows as started.
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
  const hostName = (host: HostChoice) => t(`staff.hostChoices.${host}`)
  return (
    <form
      className="stack"
      noValidate
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <header className="stack stack--tight">
        <h2 className="h2">{t('staff.roundHostsTitle')}</h2>
        <p className="muted">{t('staff.roundHostsIntro')}</p>
      </header>
      {rounds.map((round) => (
        <section className="card" key={round.round_id}>
          <fieldset className="choices" disabled={round.started}>
            <legend>
              <span className="hand hand--sm">{t('staff.roundLabel', { number: round.position })}</span>
              {round.title}
            </legend>
            {HOST_CHOICES_SHOWN.map((choice) => (
              <label className="choice" key={choice}>
                <input
                  type="radio"
                  name={`round-${round.round_id}`}
                  value={choice}
                  checked={(draft[round.round_id] ?? round.host_choice) === choice}
                  onChange={() => setDraft({ ...draft, [round.round_id]: choice })}
                />
                <span className="choice__avatar">{choice === 'random' ? <span className="choice__random">{SHUFFLE}</span> : <Character name={hostCharacter(choice, 'greeting')} size={48} />}</span>
                {hostName(choice)}
              </label>
            ))}
            {round.started && round.host ? <p className="small muted col-span-full">{t('staff.roundStarted', { host: hostName(round.host) })}</p> : null}
          </fieldset>
        </section>
      ))}
      <button type="submit" className="btn btn--primary btn--block" disabled={save.isPending || changedChoices(rounds, draft).length === 0}>
        {t('staff.roundHostsSave')}
      </button>
      <div role="status" aria-live="polite">{save.isSuccess ? <p className="note">{t('staff.roundHostsSaved')}</p> : <p className="small muted center">{t('staff.roundHostsHint')}</p>}</div>
      {save.error ? (
        <p role="alert" className="field__error">
          {errorMessage(errorCode(save.error), t)}
        </p>
      ) : null}
    </form>
  )
}

const PLACES = [1, 2, 3] as const

/** Animal naming prizes and the My Animal feed: check proposed names, set each night's prizes, post updates, add animals. */
export function AnimalsAdminPage() {
  const { t } = useTranslation()
  const data = useQuery({ queryKey: ['staff-animals'], queryFn: api.staffAnimals })
  const animals = data.data?.animals ?? []
  const rights = data.data?.rights ?? []
  return (
    <section className="flex flex-col gap-6">
      <h1 className="h1">{t('staff.animalsTitle')}</h1>
      <PendingNames rights={rights} />
      <NightPrizes animals={animals} />
      <div className="flex flex-col gap-3">
        <h2 className="h2">{t('staff.animalList')}</h2>
        {animals.length === 0 ? <p className="muted">{t('staff.noAnimals')}</p> : null}
        <ul className="flex flex-col gap-3">
          {animals.map((animal) => (
            <AnimalRow key={animal.id} animal={animal} />
          ))}
        </ul>
      </div>
      <NewAnimal />
    </section>
  )
}

function PendingNames({ rights }: { rights: StaffNamingRight[] }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const review = useMutation({
    mutationFn: (input: { right_id: string; status: 'approved' | 'rejected' }) => api.staffReviewAnimalName(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-animals'] }),
  })
  return (
    <div className="flex flex-col gap-3">
      <h2 className="h2">{t('staff.pendingNames')}</h2>
      {rights.length === 0 ? <p className="muted">{t('staff.noPendingNames')}</p> : null}
      <ul className="flex flex-col gap-2">
        {rights.map((right) => (
          <li key={right.id} className="card">
            <p className="text-lg text-ink">{t('staff.proposal', { team: right.team_name, code: right.join_code, place: right.place, name: right.proposed_name, species: right.animal.species })}</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn--primary" onClick={() => review.mutate({ right_id: right.id, status: 'approved' })} disabled={review.isPending} aria-label={t('staff.approveName', { name: right.proposed_name })}>
                {t('host.approve')}
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => review.mutate({ right_id: right.id, status: 'rejected' })} disabled={review.isPending} aria-label={t('staff.rejectName', { name: right.proposed_name })}>
                {t('host.reject')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {review.error ? <p role="alert" className="field__error">{errorMessage(errorCode(review.error), t)}</p> : null}
    </div>
  )
}

function NightPrizes({ animals }: { animals: StaffAnimal[] }) {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const events = useQuery({ queryKey: ['host-events'], queryFn: api.hostEvents })
  const [eventId, setEventId] = useState('')
  const chosen = eventId || events.data?.events[0]?.id || ''
  const set = useMutation({
    mutationFn: (input: { place: number; animal_id: string | null }) => api.staffSetNamingPrize({ event_id: chosen, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-animals'] }),
  })
  const atPlace = (place: number) => animals.find((a) => a.prize?.event_id === chosen && a.prize.place === place)
  const choices = (place: number) => animals.filter((a) => a.name === null && (!a.prize || (a.prize.event_id === chosen && a.prize.place === place)))

  return (
    <div className="card">
      <h2 className="h2">{t('staff.nightPrizes')}</h2>
      <label htmlFor={`${id}-event`} className="field__label">
        {t('staff.event')}
      </label>
      <span className="select"><select id={`${id}-event`} value={chosen} onChange={(e) => setEventId(e.target.value)} className="field__select">
        {events.data?.events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.join_code} · {event.theme}
          </option>
        ))}
      </select></span>
      {PLACES.map((place) => (
        <div key={place} className="flex flex-col gap-1">
          <label htmlFor={`${id}-${place}`} className="field__label">
            {t('staff.placeLabel', { place })}
          </label>
          <span className="select"><select
            id={`${id}-${place}`}
            value={atPlace(place)?.id ?? ''}
            onChange={(e) => set.mutate({ place, animal_id: e.target.value || null })}
            disabled={set.isPending}
            className="field__select"
          >
            <option value="">{t('staff.noPrize')}</option>
            {choices(place).map((a) => (
              <option key={a.id} value={a.id}>
                {a.species} · {a.exhibit}
              </option>
            ))}
          </select></span>
        </div>
      ))}
      {set.error ? <p role="alert" className="field__error">{errorMessage(errorCode(set.error), t)}</p> : null}
    </div>
  )
}

function AnimalRow({ animal }: { animal: StaffAnimal }) {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const post = useMutation({
    mutationFn: () => api.staffPostAnimalUpdate({ animal_id: animal.id, body }),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['staff-animals'] })
    },
  })
  const title = animal.name ? `${animal.name} · ${animal.species}` : animal.species
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (body.trim()) post.mutate()
  }
  return (
    <li className="card">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="muted">
        {animal.exhibit} · {t('staff.animalStats', { updates: animal.update_count, followers: animal.follower_count })}
        {animal.prize ? ` · ${t('staff.offered', { code: animal.prize.join_code, place: animal.prize.place })}` : ''}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
        <label htmlFor={id} className="field__label">
          {t('staff.updateLabel', { animal: title })}
        </label>
        <textarea id={id} value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} rows={2} className="field__input field__input--area" />
        <button type="submit" className="btn btn--secondary" disabled={post.isPending || !body.trim()}>
          {t('staff.postUpdate')}
        </button>
        <div role="status">{post.isSuccess ? <p className="note">{t('staff.posted')}</p> : null}</div>
      </form>
    </li>
  )
}

function NewAnimal() {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const empty = { species: '', scientific_name: '', exhibit: '', about: '', avatar: 'mystery' as AnimalAvatar }
  const [form, setForm] = useState(empty)
  const create = useMutation({
    mutationFn: () => api.staffCreateAnimal(form),
    onSuccess: () => {
      setForm(empty)
      void queryClient.invalidateQueries({ queryKey: ['staff-animals'] })
    },
  })
  const fields = ['species', 'scientific_name', 'exhibit', 'about'] as const
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (form.species.trim() && form.exhibit.trim()) create.mutate()
  }
  return (
    <form onSubmit={submit} className="card" noValidate>
      <h2 className="h2">{t('staff.addAnimal')}</h2>
      {fields.map((field) => (
        <div key={field} className="flex flex-col gap-1">
          <label htmlFor={`${id}-${field}`} className="field__label">
            {t(`staff.animalFields.${field}`)}
          </label>
          <input className="field__input" id={`${id}-${field}`} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Character name={animalCharacter(form.avatar)} size={48} />
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${id}-avatar`} className="field__label">
            {t('staff.animalFields.avatar')}
          </label>
          <span className="select"><select
            id={`${id}-avatar`}
            value={form.avatar}
            onChange={(e) => setForm({ ...form, avatar: e.target.value as AnimalAvatar })}
            className="field__select"
          >
            {ANIMAL_AVATARS.map((avatar) => (
              <option key={avatar} value={avatar}>
                {t(`staff.avatars.${avatar}`)}
              </option>
            ))}
          </select></span>
        </div>
      </div>
      <button type="submit" className="btn btn--primary" disabled={create.isPending || !form.species.trim() || !form.exhibit.trim()}>
        {t('staff.addAnimal')}
      </button>
      {create.error ? <p role="alert" className="field__error">{errorMessage(errorCode(create.error), t)}</p> : null}
    </form>
  )
}

export function NewsletterPage() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4">
      <h1 className="h1">{t('staff.newsletterTitle')}</h1>
      <a href="/api/staff_newsletter_csv" download className="btn btn--secondary">
        {t('staff.download')}
      </a>
    </section>
  )
}
