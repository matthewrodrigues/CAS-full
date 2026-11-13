import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gift, PawPrint } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { MyNamingRight, MyReward } from '../../../shared/game'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'
import { PrizeList } from './prize-list'

/** The Rewards tab: animals the team won the right to name, then any prize codes for staff to scan. */
export function RewardsPage() {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const ended = live.view?.state.phase === 'ended'
  // Prizes appear at the end of the night, so refetch once the game ends.
  const rewards = useQuery({ queryKey: ['rewards', ended], queryFn: api.myRewards, staleTime: 0 })
  const rights = useQuery({ queryKey: ['naming-rights', ended], queryFn: api.myNamingRights, staleTime: 0 })
  const list = rewards.data?.rewards ?? []
  const namings = rights.data?.rights ?? []

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('rewards.title')}</h1>
      {list.length === 0 && namings.length === 0 ? (
        <>
          <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
            <Gift aria-hidden className="mt-1 size-6 shrink-0 text-brand-deep" />
            <p className="text-lg text-ink-muted">{t('rewards.empty')}</p>
          </div>
          {ended ? null : <PrizeList eventId={eventId} />}
        </>
      ) : null}
      {namings.length ? (
        <ul className="flex flex-col gap-4">
          {namings.map((right) => (
            <NamingCard key={right.id} right={right} />
          ))}
        </ul>
      ) : null}
      {list.length ? (
        <>
          <p className="text-lg text-ink-muted">{t('rewards.show')}</p>
          <ul className="flex flex-col gap-4">
            {list.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

/** A won naming right: propose a name, see staff's decision, then follow the animal. */
function NamingCard({ right }: { right: MyNamingRight }) {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const propose = useMutation({
    mutationFn: () => api.proposeAnimalName({ right_id: right.id, name }),
    onSuccess: () => {
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['naming-rights'] })
    },
  })
  const { animal } = right
  const decided = animal.name !== null
  const won = right.status === 'approved'
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) propose.mutate()
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <div className="flex items-start gap-3">
        <PawPrint aria-hidden className="mt-1 size-6 shrink-0 text-depth" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink-muted">{t('naming.won', { place: right.place, team: right.team_name })}</p>
          <h2 className="text-xl font-semibold text-ink">{decided ? t('naming.named', { name: animal.name, species: animal.species }) : t('naming.title', { species: animal.species })}</h2>
          <p className="text-base text-ink-muted">{t('animals.exhibit', { exhibit: animal.exhibit })}</p>
        </div>
      </div>
      {animal.about ? <p className="text-base text-ink">{animal.about}</p> : null}
      <p role="status" className={cn('self-start rounded-full px-3 py-1 text-sm font-medium', won ? 'bg-win text-ink' : 'bg-bg text-ink-muted')}>
        {decided && !won ? t('naming.status.other') : t(`naming.status.${right.status}`, { name: right.proposed_name })}
      </p>
      {decided ? null : (
        <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
          <label htmlFor={id} className="text-base font-medium text-ink">
            {right.status === 'open' ? t('naming.label') : t('naming.relabel')}
          </label>
          <Input id={id} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          <Button type="submit" size="lg" disabled={propose.isPending || !name.trim()}>
            {t('naming.submit')}
          </Button>
          {propose.error ? (
            <p role="alert" className="text-base font-medium text-incorrect">
              {errorCode(propose.error) === 'name_not_allowed' ? t('naming.notAllowed') : errorMessage(errorCode(propose.error), t)}
            </p>
          ) : null}
        </form>
      )}
      <Button asChild variant="outline">
        <Link to={`../animals/${animal.id}`}>{t('naming.track')}</Link>
      </Button>
    </li>
  )
}

function RewardCard({ reward }: { reward: MyReward }) {
  const { t } = useTranslation()
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    void QRCode.toDataURL(reward.code, { margin: 1, width: 240 }).then(setQr)
  }, [reward.code])
  const usable = reward.status === 'issued'
  return (
    <li className="flex flex-col items-center gap-3 rounded-xl bg-surface p-4 text-center">
      <h2 className="text-xl font-semibold text-ink">{reward.name}</h2>
      {reward.description ? <p className="text-base text-ink-muted">{reward.description}</p> : null}
      <p className={cn('rounded-full px-3 py-1 text-sm font-medium', usable ? 'bg-win text-ink' : 'bg-bg text-ink-muted')}>{t(`rewards.status.${reward.status}`)}</p>
      {usable && qr ? <img src={qr} alt={t('rewards.qr', { name: reward.name })} className="size-48" /> : null}
      <p className="font-mono text-2xl font-semibold tracking-widest text-ink">{t('rewards.code', { code: reward.code })}</p>
      <p className="text-sm text-ink-muted">{t('rewards.expires', { date: new Date(reward.expires_at).toLocaleDateString() })}</p>
    </li>
  )
}
