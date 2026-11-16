import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendLabel } from '@/game/answer-sheet'
import { cn } from '@/lib/utils'

/**
 * Multiple choice and true/false: a tap only circles an answer on this player's own sheet; the
 * send button sends it for the team. The circled option is marked with a check, not color alone,
 * and on cream it stays sunk onto its edge (the design system's pop). The team's sent answer
 * carries a "Sent!" note, so a teammate sending another answer never moves my circle.
 * Takes its strings as props so it stays a plain function of its props.
 */
export function AnswerChoice({
  options,
  circled,
  sent,
  disabled,
  text,
  onCircle,
  onSend,
}: {
  options: string[]
  circled: number | null
  sent: number | null
  disabled: boolean
  text: { send: string; sendInstead: string; sent: string }
  onCircle(option: number): void
  onSend(): void
}) {
  const label = sendLabel(circled, sent)
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {options.map((label, option) => {
          const chosen = circled === option
          return (
            <li key={label}>
              <button
                type="button"
                aria-pressed={chosen}
                disabled={disabled}
                onClick={() => onCircle(option)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-lg font-medium',
                  'transition-[translate,box-shadow] duration-75 ease-out motion-reduce:transition-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60',
                  chosen
                    ? 'border-brand-deep bg-brand text-surface shadow-pop-sm motion-safe:translate-y-0.5'
                    : 'border-brand-deep bg-surface text-ink shadow-pop hover:border-brand active:not-disabled:shadow-pop-sm motion-safe:active:not-disabled:translate-y-0.5',
                )}
              >
                <span className="flex-1">{label}</span>
                {sent === option ? <span className="text-base font-semibold">{text.sent}</span> : null}
                {chosen ? <Check aria-hidden className="size-6 shrink-0" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
      {label ? (
        <Button type="button" size="lg" disabled={disabled} onClick={onSend}>
          {label === 'send' ? text.send : text.sendInstead}
        </Button>
      ) : null}
    </div>
  )
}
