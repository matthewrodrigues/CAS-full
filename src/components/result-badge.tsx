import { Check, Search, X, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AutoResult } from '../../shared/enums'
import { cn } from '@/lib/utils'

const STYLE: Record<AutoResult | 'none', { icon: LucideIcon | null; className: string }> = {
  correct: { icon: Check, className: 'bg-correct text-ink motion-safe:animate-in motion-safe:zoom-in-95' },
  incorrect: { icon: X, className: 'bg-incorrect text-surface' },
  review: { icon: Search, className: 'bg-info-soft text-ink' },
  none: { icon: null, className: 'bg-surface text-ink' },
}

/** A result always pairs color with an icon and a word (docs/SPEC.md section 7). */
export function ResultBadge({ result, points }: { result: AutoResult | null; points: number | null }) {
  const { t } = useTranslation()
  const key = result ?? 'none'
  const { icon: Icon, className } = STYLE[key]
  const word = { correct: t('result.correct'), incorrect: t('result.incorrect'), review: t('result.review'), none: t('result.none') }[key]
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border-2 border-brand-deep p-4 shadow-pop', className)}>
      {Icon ? <Icon aria-hidden className="size-8 shrink-0" /> : null}
      <div className="flex flex-col">
        <h1 className="font-heading text-2xl font-semibold">{word}</h1>
        {points ? <p className="text-lg font-medium tabular-nums">{t('result.points', { count: Math.abs(points), sign: points > 0 ? '+' : '−' })}</p> : null}
      </div>
    </div>
  )
}
