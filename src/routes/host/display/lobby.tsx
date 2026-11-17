import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameView } from '../../../../shared/game'
import { Character, animalCharacter } from '@/components/character'
import { HostStage } from '@/components/host-stage'
import { bigExpression } from '@/game/big-screen'
import { api } from '@/lib/api'
import { usePrizes, useThemeName } from './data'
import { BigFrame } from './frame'

const MAX_TEAMS = 15

/** Before the first question (big-lobby): the QR to join, the code, who has joined, and Rocco. */
export function Lobby({ view, paused }: { view: GameView; paused: boolean }) {
  const { t } = useTranslation()
  const config = useQuery({ queryKey: ['app-config'], queryFn: api.appConfig, staleTime: Infinity })
  const theme = useThemeName(view.event.id)
  const prizes = usePrizes(view.event.id)
  // The page's own origin when the host hasn't set a public URL.
  const url = `${config.data?.public_url ?? location.origin}/play/${view.event.join_code}`
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    // Ink on the card, as in the mockup: the color comes from the token, not a literal.
    const css = getComputedStyle(document.documentElement)
    const ink = css.getPropertyValue('--color-ink').trim()
    const card = css.getPropertyValue('--color-surface').trim()
    void QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: ink || undefined, light: card || undefined } }).then(setQr)
  }, [url])
  const names = view.teams.flatMap((team) => (team.name ? [team.name] : []))

  const stage = (
    <HostStage
      host={view.cast.host}
      expression={paused ? bigExpression('paused') : bigExpression('lobby')}
      line={paused ? t('host.lines.bigPaused') : t('host.lines.bigLobby')}
      tone="butter"
      hero
      size={400}
    >
      {prizes.data?.length ? (
        <div className="stack">
          <p className="body">{t('display.prizes')}</p>
          <div className="avatar-row">
            {prizes.data.map((prize) => (
              <Character key={prize.place} name={animalCharacter(prize.animal.avatar)} size={128} label={prize.animal.species} />
            ))}
          </div>
        </div>
      ) : null}
    </HostStage>
  )

  return (
    <BigFrame pill={paused ? 'paused' : 'waiting'} note={theme.data ? t('display.lobbyNote', { theme: theme.data }) : t('display.join')} stage={stage}>
      <div className="row row--wide">
        <div className="qr">{qr ? <img src={qr} alt={t('display.qr')} /> : null}</div>
        <div className="stack stack--loose">
          <h1 className="h1">{t('display.join')}</h1>
          <p className="body">
            {t('display.scan')}
            <br />
            <strong className="h2">{url.replace(/^https?:\/\//, '')}</strong>
          </p>
          <div className="stack stack--tight">
            <p className="body muted--night">{t('display.codeLabel')}</p>
            <p className="code-display code-display--xl">{view.event.join_code}</p>
          </div>
        </div>
      </div>
      <section className="stack" aria-labelledby="teams-title">
        <h2 className="h2" id="teams-title">
          {t('display.teams', { count: view.teams.length })}
        </h2>
        <ul className="list list--cols-3">
          {names.slice(0, MAX_TEAMS).map((name, i) => (
            <li key={`${name}-${i}`} className="list-row">
              <span className="list-row__name">{name}</span>
            </li>
          ))}
        </ul>
        {names.length > MAX_TEAMS ? <p className="body muted--night">{t('display.moreTeams', { count: names.length - MAX_TEAMS })}</p> : null}
      </section>
    </BigFrame>
  )
}
