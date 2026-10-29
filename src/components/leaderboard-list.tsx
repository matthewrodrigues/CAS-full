import { useTranslation } from 'react-i18next'
import type { LeaderboardRow } from '../../shared/game'
import { cn } from '@/lib/utils'

/** Tonight's ranks. The player app and (Milestone 4) the big screen both use it. First place sits on a Sunflower disc. */
export function LeaderboardList({ rows, ownTeamId, limit }: { rows: LeaderboardRow[]; ownTeamId?: string | null; limit?: number }) {
  const { t } = useTranslation()
  const shown = limit ? rows.slice(0, limit) : rows
  return (
    <ol className="flex flex-col gap-2">
      {shown.map((row) => {
        const own = row.team_id === ownTeamId
        return (
          <li
            key={row.team_id}
            className={cn('flex items-center gap-3 rounded-lg border-2 border-brand-deep p-3', own ? 'bg-info-soft shadow-pop' : 'bg-surface shadow-pop-sm')}
            aria-current={own ? 'true' : undefined}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-ink tabular-nums',
                row.rank === 1 && 'bg-win ring-2 ring-brand-deep ring-inset',
              )}
            >
              <span className="sr-only">{t('leaderboard.rank')} </span>
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg text-ink">
              {row.name ?? t('play.team.unnamed')}
              {own ? <span className="ml-2 text-sm text-ink-muted">{t('leaderboard.yours')}</span> : null}
            </span>
            <span className="text-lg font-semibold text-ink tabular-nums">{t('leaderboard.points', { count: row.points })}</span>
          </li>
        )
      })}
    </ol>
  )
}
