import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Role } from '../../shared/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'

const RANK: Record<Role, number> = { player: 0, host: 1, staff: 2 }

/**
 * Host and staff screens ask for that role's passcode when the session doesn't have it
 * (docs/SPEC.md section 3). The server checks the role on every route regardless.
 */
export function RoleGate({ role, children }: { role: 'host' | 'staff'; children: ReactNode }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: Infinity })
  const [passcode, setPasscode] = useState('')
  const id = useId()
  const login = useMutation({
    mutationFn: () => api.login(passcode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })

  if (me.isPending) return null
  if (me.data?.role && RANK[me.data.role] >= RANK[role]) return <>{children}</>

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (passcode) login.mutate()
  }
  const failed = login.error instanceof ApiError ? (login.error.status === 429 ? t('gate.tooMany') : t('gate.wrong')) : login.error ? t('errors.network') : null

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{t('app.name')}</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">{role === 'host' ? t('gate.hostTitle') : t('gate.staffTitle')}</h1>
        <p className="text-lg text-ink-muted">{role === 'host' ? t('gate.hostIntro') : t('gate.staffIntro')}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <label htmlFor={id} className="text-base font-medium text-ink">
          {t('gate.passcode')}
        </label>
        <Input id={id} type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" />
        {failed ? (
          <p role="alert" className="text-base font-medium text-incorrect">
            {failed}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={login.isPending || !passcode}>
          {t('gate.submit')}
        </Button>
      </form>
    </main>
  )
}
