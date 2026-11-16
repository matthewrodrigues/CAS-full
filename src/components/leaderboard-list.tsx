import { useTranslation } from 'react-i18next'
import type { LeaderboardRow, NamingPrize } from '../../shared/game'
import { prizeAnimal } from '@/game/after-game'
import { Character, animalCharacter } from './character'

/**
 * Tonight's ranks as kit list rows (kit.md §12). The player app and the big screen both use it.
 * Ranks 1-3 sit in a Lamplight bubble. Pass `prizes` and only the top 3 rows show their prize animal:
 * teams don't own animals, so ranks 4 and below have no avatar.
 */
export function LeaderboardList({
  rows,
  ownTeamId,
  limit,
  prizes = [],
  label,
}: {
  rows: LeaderboardRow[]
  ownTeamId?: string | null
  limit?: number
  prizes?: NamingPrize[]
  /** The list's accessible name, e.g. "Tonight's leaderboard". */
  label?: string
}) {
  const { t } = useTranslation()
  const shown = limit ? rows.slice(0, limit) : rows
  return (
    <ol className="list" aria-label={label}>
      {shown.map((row) => {
        const own = row.team_id === ownTeamId
        const animal = prizeAnimal(row.rank, prizes)
        return (
          <li key={row.team_id} className={['list-row', row.rank <= 3 ? 'is-top' : null, own ? 'is-you' : null].filter(Boolean).join(' ')} aria-current={own ? 'true' : undefined}>
            <span className="list-row__rank">
              <span className="sr-only">{t('leaderboard.rank')} </span>
              {row.rank}
            </span>
            {animal ? <Character name={animalCharacter(animal.avatar)} size={48} /> : null}
            <span className="list-row__name">
              {row.name ?? t('play.team.unnamed')}
              {own ? (
                <>
                  {' '}
                  <span className="tag">{t('leaderboard.you')}</span>
                </>
              ) : null}
              {animal ? <span className="list-row__sub">{t('leaderboard.names', { species: animal.species })}</span> : null}
            </span>
            <span className="list-row__score">
              {row.points}
              <span className="sr-only"> {t('leaderboard.pointsSr')}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
