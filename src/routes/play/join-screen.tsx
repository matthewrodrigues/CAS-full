import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Character, hostCharacter } from '@/components/character'
import { hostLabel } from '@/game/cast'
import { errorCode, errorMessage } from './errors'
import { FieldError } from './field-error'

const MAX_NICKNAME = 24

/**
 * Step 1 of 2: the nickname (design/screens/join-nickname.html). A form screen, so the host steps
 * back to 64px beside the heading and the keyboard has room. No status pill: not in the game yet.
 * The night's theme isn't known until the join succeeds, so the top row names the series instead.
 */
export function JoinScreen({ error, joining, onJoin }: { error: unknown; joining: boolean; onJoin(nickname: string): void }) {
  const { t } = useTranslation()
  const [nickname, setNickname] = useState('')
  // A join error shows until the player edits the name again.
  const [dismissed, setDismissed] = useState<unknown>(null)
  const showError = !!error && error !== dismissed
  const id = useId()
  const formId = `${id}-form`

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (nickname.trim()) onJoin(nickname.trim())
  }

  return (
    <main className="screen">
      <div className="screen__top">
        <p className="hand hand--sm">{t('play.join.tonight')}</p>
        <p className="hand hand--sm">{t('play.join.step', { step: 1 })}</p>
      </div>

      <header className="row">
        <Character name={hostCharacter('rocco', 'greeting')} size={64} label={hostLabel(t, 'rocco', 'greeting')} />
        <h1 className="h1">{t('play.join.title')}</h1>
      </header>
      <p className="muted">{t('play.join.intro')}</p>

      <form className="stack stack--loose" id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-nickname`}>
            {t('play.join.nickname')}
          </label>
          <input
            className="field__input"
            id={`${id}-nickname`}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setDismissed(error)
            }}
            maxLength={MAX_NICKNAME}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
            placeholder={t('play.join.placeholder')}
            aria-describedby={`${id}-foot ${id}-error`}
            aria-invalid={showError ? true : undefined}
          />
          <div className="field__foot" id={`${id}-foot`}>
            <span>{t('play.join.hint')}</span>
            <span className="field__count" aria-live="off">
              {t('play.count', { count: nickname.length, max: MAX_NICKNAME })}
            </span>
          </div>
          <div role="alert" id={`${id}-error`}>
            {showError ? <FieldError>{errorMessage(errorCode(error), t)}</FieldError> : null}
          </div>
        </div>
      </form>

      <div className="screen__actions">
        <button type="submit" form={formId} className="btn btn--primary btn--block" disabled={joining || !nickname.trim()}>
          {joining ? t('play.join.joining') : t('play.join.submit')}
        </button>
        <p className="small muted center">{t('play.join.next')}</p>
      </div>
    </main>
  )
}
