import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Multiple choice and true/false: one tap submits, and another tap changes the answer until
 * the lock (the last submit wins). The chosen option is marked with a check, not color alone.
 */
export function AnswerChoice({
  options,
  selected,
  disabled,
  violet,
  onPick,
}: {
  options: string[]
  selected: number | null
  disabled: boolean
  violet: boolean
  onPick(option: number): void
}) {
  return (
    <ul className="flex flex-col gap-3">
      {options.map((label, option) => {
        const chosen = selected === option
        return (
          <li key={label}>
            <button
              type="button"
              aria-pressed={chosen}
              disabled={disabled}
              onClick={() => onPick(option)}
              className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-lg font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60',
                chosen ? 'border-brand bg-brand text-surface' : violet ? 'border-surface bg-transparent text-surface' : 'border-border bg-surface text-ink',
              )}
            >
              <span className="flex-1">{label}</span>
              {chosen ? <Check aria-hidden className="size-6 shrink-0" /> : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
