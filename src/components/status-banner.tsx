import { CheckCheck, Clock, Hourglass, Lock, Pause } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Status = 'waiting' | 'live' | 'locked' | 'results' | 'paused'

const STYLE: Record<Status, { icon: typeof Clock; className: string }> = {
  waiting: { icon: Hourglass, className: 'bg-surface text-ink border-border' },
  live: { icon: Clock, className: 'bg-urgent text-ink border-transparent' },
  locked: { icon: Lock, className: 'bg-info-soft text-ink border-transparent' },
  results: { icon: CheckCheck, className: 'bg-win text-ink border-transparent' },
  paused: { icon: Pause, className: 'bg-surface text-ink border-border' },
}

/** The status line every play screen shows (docs/SPEC.md section 7): waiting, live, locked, results. */
export function StatusBanner({ status, children }: { status: Status; children: ReactNode }) {
  const { icon: Icon, className } = STYLE[status]
  return (
    <p className={cn('inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-sm font-medium', className)}>
      <Icon aria-hidden className="size-4" />
      {children}
    </p>
  )
}
