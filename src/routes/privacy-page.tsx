import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

/** /privacy: what the game keeps, and delete_my_account (docs/SPEC.md section 8, Milestone 6). */
export function PrivacyPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: Infinity })
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({ mutationFn: api.deleteMyAccount, onSuccess: () => queryClient.clear() })
  const paragraphs = t('privacy.body', { returnObjects: true }) as string[]

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('privacy.title')}</h1>
      {paragraphs.map((p) => (
        <p key={p} className="text-lg text-ink">
          {p}
        </p>
      ))}
      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="text-xl font-semibold text-ink">{t('privacy.deleteTitle')}</h2>
        <p className="text-base text-ink-muted">{t('privacy.deleteBody')}</p>
        <div role="status">{remove.isSuccess ? <p className="text-lg font-medium text-ink">{t('privacy.done')}</p> : null}</div>
        {remove.isSuccess ? null : !me.data?.player ? (
          <p className="text-base text-ink-muted">{t('privacy.notJoined')}</p>
        ) : confirming ? (
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {t('privacy.confirm')}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t('privacy.cancel')}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)}>
            {t('privacy.delete')}
          </Button>
        )}
      </section>
      <Link to="/" className="text-base text-ink underline underline-offset-4">
        {t('privacy.back')}
      </Link>
    </main>
  )
}
