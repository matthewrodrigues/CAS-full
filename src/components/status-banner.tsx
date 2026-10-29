import { CheckCheck, Clock, Hourglass, Lock, Pause } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Status = 'waiting' | 'live' | 'locked' | 'results' | 'paused'

const STYLE: Record<Status, { icon: typeof Clock; className: string }> = {
  waiting: { icon: Hourglass, className: 'bg-surface' },
  live: { icon: Clock, className: 'bg-urgent' },
  locked: { icon: Lock, className: 'bg-info-soft' },
  results: { icon: CheckCheck, className: 'bg-win' },
  paused: { icon: Pause, className: 'bg-surface' },
}

/** The status line every play screen shows (docs/SPEC.md section 7): waiting, live, locked, results. */
export function StatusBanner({ status, children }: { status: Status; children: ReactNode }) {
  const { icon: Icon, className } = STYLE[status]
  return (
    <p className={cn('inline-flex items-center gap-2 self-start rounded-full border-2 border-brand-deep px-3 py-1 text-sm font-medium text-ink shadow-pop-sm', className)}>
      <Icon aria-hidden className="size-4" />
      {children}
    </p>
  )
}
