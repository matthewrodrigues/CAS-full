import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Character, animalCharacter } from '@/components/character'
import { HostStage } from '@/components/host-stage'
import { StatusPill } from '@/components/status-pill'
import { hostExpression, initialOf } from '@/game/cast'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { TeamScreen } from './team-screen'

/**
 * Before the first question (design/screens/lobby.html): Rocco greets the team on a butter stage,
 * then the team's members and tonight's prizes. Nothing to do yet, so the only action is the quiet
 * "Switch team".
 */
export function LobbyScreen() {
  const { t } = useTranslation()
  const { eventId, playerId, themeName, live } = usePlay()
  // ?switch=1 while the player picks another team: its own history entry (Back returns to the lobby),
  // and the layout hides the tab bar there, as on the other join screens.
  const [params, setParams] = useSearchParams()
  const switching = params.has('switch')
  const setSwitching = (on: boolean) => setParams(on ? { switch: '1' } : {}, { replace: !on })
  const id = useId()
  const view = live.view!
  const team = view.my_team!

  if (switching) return <TeamScreen onCancel={() => setSwitching(false)} onDone={() => setSwitching(false)} />

  const nameNote = { pending: t('play.lobby.pending'), approved: t('play.lobby.approved'), rejected: t('play.lobby.rejected') }[team.name_status]

  return (
    <>
      <div className="screen__top">
        <StatusPill status="waiting" />
        <p className="hand hand--sm">{themeName}</p>
      </div>

      {/* Rocco always hosts the lobby (spec). */}
      <HostStage host="rocco" expression={hostExpression(view)} line={t('host.lines.lobby')} tone="butter" hero labelledBy={`${id}-team`}>
        <div className="stack stack--tight">
          <p className="hand hand--sm">{t('play.lobby.onTeam')}</p>
          <h1 className="h1" id={`${id}-team`}>
            {team.name}
          </h1>
          <p className="small muted">{nameNote}</p>
        </div>
      </HostStage>

      <section className="stack" aria-labelledby={`${id}-members`}>
        <div className="card__head card__head--split">
          <h2 className="h2" id={`${id}-members`}>
            {t('play.lobby.members')}
          </h2>
          <p className="hand hand--sm">{t('play.members', { count: team.members.length })}</p>
        </div>
        <ul className="list">
          {team.members.map((member) => {
            const you = member.id === playerId
            return (
              <li key={member.id} className={you ? 'list-row is-you' : 'list-row'}>
                <span className="initial" aria-hidden="true">
                  {initialOf(member.nickname)}
                </span>
                <span className="list-row__name">
                  <span>{member.nickname}</span>
                  {you ? (
                    <>
                      {' '}
                      <span className="tag">{t('play.lobby.you')}</span>
                    </>
                  ) : null}
                  {member.id === team.captain_id ? (
                    <span className="list-row__sub">
                      <svg className="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
                      </svg>{' '}
                      {t('play.lobby.captain')}
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <LobbyPrizes eventId={eventId} />

      <div className="screen__actions">
        <button type="button" className="btn btn--quiet" onClick={() => setSwitching(true)}>
          {t('play.lobby.switch')}
        </button>
        <p className="small muted center">{t('play.lobby.switchHint')}</p>
      </div>
    </>
  )
}

/** Tonight's prizes: the animals the top teams get to name. Renders nothing when the night has none. */
function LobbyPrizes({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const list = prizes.data?.prizes ?? []
  if (list.length === 0) return null
  const animals = new Intl.ListFormat(i18n.language, { type: 'disjunction' }).format(list.map((prize) => prize.animal.species))

  return (
    <section className="card" aria-labelledby={`${id}-prizes`}>
      <h2 className="body" id={`${id}-prizes`}>
        <strong>{t('play.lobby.prizesTitle')}</strong>
      </h2>
      <div className="row">
        {list.map((prize) => (
          <Character key={prize.place} name={animalCharacter(prize.animal.avatar)} size={48} />
        ))}
      </div>
      <p className="small muted">{t('play.lobby.prizesBody', { count: list.length, animals })}</p>
    </section>
  )
}
