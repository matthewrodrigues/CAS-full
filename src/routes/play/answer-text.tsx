import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { debounce } from '@/game/debounce'
import { cn } from '@/lib/utils'

const DRAFT_MS = 500

/**
 * Typed and closest-number answers (SPEC section 5): every edit saves a draft 500 ms after the
 * last keystroke, so nothing is lost if the connection drops; the one primary button submits.
 * Only the player's own edits save drafts, so a restored draft is never overwritten on mount.
 */
export function AnswerText({
  numeric,
  initial,
  disabled,
  violet,
  onDraft,
  onSubmit,
}: {
  numeric: boolean
  initial: string
  disabled: boolean
  violet: boolean
  onDraft(value: string | number): void
  onSubmit(value: string | number): void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [text, setText] = useState(initial)
  const [invalid, setInvalid] = useState(false)
  const parse = (value: string): string | number | null => {
    if (!numeric) return value.trim()
    const number = Number(value.replace(/,/g, '').trim())
    return value.trim() !== '' && Number.isFinite(number) ? number : null
  }
  // The latest onDraft, so the debounced save survives re-renders with a fresh callback.
  const draft = useRef(onDraft)
  useEffect(() => {
    draft.current = onDraft
  }, [onDraft])
  const [saveDraft] = useState(() => debounce((value: string | number) => draft.current(value), DRAFT_MS))
  // A draft still pending when the question closes would only be refused.
  useEffect(() => () => saveDraft.cancel(), [saveDraft])

  const change = (value: string) => {
    setText(value)
    setInvalid(false)
    const parsed = parse(value)
    if (parsed !== null && parsed !== '') saveDraft(parsed)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = parse(text)
    if (parsed === null || parsed === '') {
      setInvalid(numeric)
      return
    }
    saveDraft.cancel()
    onSubmit(parsed)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <label htmlFor={id} className={cn('text-base font-medium', violet ? 'text-surface' : 'text-ink')}>
        {numeric ? t('question.numberLabel') : t('question.answerLabel')}
      </label>
      <Input
        id={id}
        value={text}
        onChange={(e) => change(e.target.value)}
        disabled={disabled}
        inputMode={numeric ? 'decimal' : 'text'}
        autoComplete="off"
        autoCapitalize={numeric ? 'off' : 'sentences'}
        enterKeyHint="send"
        maxLength={200}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
      />
      {invalid ? (
        <p id={`${id}-error`} role="alert" className={cn('text-base font-medium', violet ? 'text-surface' : 'text-incorrect')}>
          {t('question.notNumber')}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={disabled}>
        {t('question.submit')}
      </Button>
    </form>
  )
}
