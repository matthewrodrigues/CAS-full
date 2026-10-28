import { useQuery } from '@tanstack/react-query'
import { Gift } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MyReward } from '../../../shared/game'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePlay } from './context'

/** The Rewards tab: prizes won, each with the code (and QR) staff scan to redeem it. */
export function RewardsPage() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const ended = live.view?.state.phase === 'ended'
  // Prizes appear at the end of the night, so refetch once the game ends.
  const rewards = useQuery({ queryKey: ['rewards', ended], queryFn: api.myRewards, staleTime: 0 })
  const list = rewards.data?.rewards ?? []

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('rewards.title')}</h1>
      {list.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
          <Gift aria-hidden className="mt-1 size-6 shrink-0 text-brand-deep" />
          <p className="text-lg text-ink-muted">{t('rewards.empty')}</p>
        </div>
      ) : (
        <>
          <p className="text-lg text-ink-muted">{t('rewards.show')}</p>
          <ul className="flex flex-col gap-4">
            {list.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </ul>
        </>
      )}
    </section>
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
