import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorCode, errorMessage } from './errors'

/** Nickname first (SPEC section 7: Join → nickname → create/join team). Placeholder layout: no design yet. */
export function JoinScreen({ error, joining, onJoin }: { error: unknown; joining: boolean; onJoin(nickname: string): void }) {
  const { t } = useTranslation()
  const [nickname, setNickname] = useState('')
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (nickname.trim()) onJoin(nickname.trim())
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{t('app.name')}</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">{t('play.join.title')}</h1>
        <p className="text-lg text-ink-muted">{t('play.join.intro')}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-base font-medium text-ink">
            {t('play.join.nickname')}
          </label>
          <Input
            id={inputId}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error ? (
          <p role="alert" className="text-base font-medium text-incorrect">
            {errorMessage(errorCode(error), t)}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={joining || !nickname.trim()}>
          {joining ? t('play.join.joining') : t('play.join.submit')}
        </Button>
      </form>
    </main>
  )
}
