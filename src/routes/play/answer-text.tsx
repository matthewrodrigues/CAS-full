import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { FieldError } from './field-error'

/**
 * Typed and closest-number answers on the paper (kit.md section 9): a labelled field with its
 * footnote. The sheet owns the text, the draft saving and the one primary button, so this is only
 * the field. `foot` is the line under it (the hint, or "Draft saved").
 */
export function AnswerText({
  numeric,
  value,
  foot,
  disabled,
  submitted,
  team = null,
  invalid,
  onChange,
  onEnter,
}: {
  numeric: boolean
  value: string
  foot: string
  disabled: boolean
  /** The team has sent exactly this: the field turns pen blue. */
  submitted: boolean
  /** What the team has sent, when it differs from this field ("Our answer so far: squid"). */
  team?: string | null
  invalid: boolean
  onChange(value: string): void
  onEnter(): void
}) {
  const { t } = useTranslation()
  const id = useId()
  const classes = ['field', numeric ? 'field--number' : null, submitted ? 'field--submitted' : null].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <label className="field__label" htmlFor={id}>
        {numeric ? t('question.numberLabel') : t('question.answerLabel')}
      </label>
      <input
        className="field__input"
        id={id}
        type="text"
        value={value}
        placeholder={numeric ? t('question.placeholderNumber') : t('question.placeholderText')}
        disabled={disabled}
        inputMode={numeric ? 'decimal' : 'text'}
        autoComplete="off"
        autoCapitalize={numeric ? 'off' : 'sentences'}
        enterKeyHint="send"
        maxLength={200}
        aria-invalid={invalid || undefined}
        aria-describedby={team ? `${id}-foot ${id}-team` : `${id}-foot`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
      />
      <div className="field__foot" id={`${id}-foot`}>
        <span>{foot}</span>
        {numeric ? null : (
          <span className="field__count" aria-hidden="true">
            {value.length} / 200
          </span>
        )}
      </div>
      {team ? (
        <p className="small" id={`${id}-team`}>
          <strong>{team}</strong> <span className="tag">{t('question.sentTag')}</span>
        </p>
      ) : null}
      {invalid ? (
        <div role="alert">
          <FieldError>{t('question.notNumber')}</FieldError>
        </div>
      ) : null}
    </div>
  )
}
