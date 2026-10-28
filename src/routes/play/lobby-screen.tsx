import { Crown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBanner } from '@/components/status-banner'
import { Button } from '@/components/ui/button'
import { usePlay } from './context'
import { TeamScreen } from './team-screen'

/** Before the first question: your team, its members and the name's approval. Placeholder layout. */
export function LobbyScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const [switching, setSwitching] = useState(false)
  const team = live.view!.my_team!

  if (switching) return <TeamScreen onCancel={() => setSwitching(false)} onDone={() => setSwitching(false)} />

  const nameNote = { pending: t('play.lobby.pending'), approved: t('play.lobby.approved'), rejected: t('play.lobby.rejected') }[team.name_status]

  return (
    <section className="flex flex-col gap-6">
      <StatusBanner status="waiting">{t('play.lobby.waiting')}</StatusBanner>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold break-words text-ink">{team.name}</h1>
        <p className="text-base text-ink-muted">{nameNote}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-ink">{t('play.lobby.members')}</h2>
          <p className="text-base text-ink-muted">{t('play.members', { count: team.members.length })}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {team.members.map((member) => (
            <li key={member.id} className="flex items-center gap-2 text-lg text-ink">
              <span>{member.nickname}</span>
              {member.id === team.captain_id ? (
                <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                  <Crown aria-hidden className="size-4" />
                  {t('play.lobby.captain')}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-muted">{t('play.lobby.switchHint')}</p>
        <Button variant="outline" onClick={() => setSwitching(true)}>
          {t('play.lobby.switch')}
        </Button>
      </div>
    </section>
  )
}
