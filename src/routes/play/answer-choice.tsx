import { cn } from '@/lib/utils'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const TF_LETTERS = ['T', 'F']

/**
 * Multiple choice and true/false on the paper (kit.md section 9): a tap only circles an answer on
 * this player's own sheet; the sheet's one primary button sends it for the team. The kit draws the
 * pen circle around a pressed option's letter, so the circle is never color alone. The team's sent
 * answer carries a "sent!" note, so a teammate sending another answer never moves my circle.
 * Takes its strings as props so it stays a plain function of its props.
 */
export function AnswerChoice({
  options,
  circled,
  sent,
  disabled,
  trueFalse,
  text,
  onCircle,
}: {
  options: string[]
  circled: number | null
  sent: number | null
  disabled: boolean
  trueFalse: boolean
  text: { group: string; sentTag: string }
  onCircle(option: number): void
}) {
  const letters = trueFalse ? TF_LETTERS : LETTERS
  return (
    <ul className={cn('options', trueFalse && 'options--tf')} aria-label={text.group}>
      {options.map((label, option) => (
        <li key={label}>
          <button type="button" className={cn('option', trueFalse && 'option--tf')} aria-pressed={circled === option} disabled={disabled} onClick={() => onCircle(option)}>
            <span className="option__letter" aria-hidden="true">
              {letters[option]}
            </span>
            <span className="option__label">{label}</span>
            {sent === option ? <span className="option__note">{text.sentTag}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
