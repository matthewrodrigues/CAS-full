import * as React from 'react'
import { cn } from '@/lib/utils'

/** A text input on tokens: 48px tall, a visible border (3:1 on cream) and the shared focus ring. */
function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-lg text-ink outline-none placeholder:text-ink-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 aria-invalid:border-incorrect aria-invalid:ring-1 aria-invalid:ring-incorrect aria-invalid:ring-inset',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
