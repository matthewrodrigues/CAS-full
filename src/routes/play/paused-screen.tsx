import { useTranslation } from 'react-i18next'
import { HostStage } from '@/components/host-stage'
import { hostExpression } from '@/game/cast'
import { usePlay } from './context'
import { NoteIcon, ScreenTop } from './paper-parts'

/**
 * The host paused outside a question (lobby, locked, reveal, round break, wager): the host takes a
 * breather and the game waits. While a question is open the paused sheet is the question itself
 * (question-screen.tsx), frozen, as in design/screens/paused.html.
 */
export function PausedScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const view = live.view!
  return (
    <>
      <ScreenTop status="paused" note={view.event.join_code} />
      <HostStage host={view.cast.host} expression={hostExpression(view)} line={t('host.lines.question.paused')} tone="butter" hero />
      <div className="screen__actions">
        <p className="note">
          <NoteIcon>
            <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" />
            <rect x="14" y="5" width="3.5" height="14" rx="1.2" />
          </NoteIcon>
          <span>{t('question.pausedGeneric')}</span>
        </p>
      </div>
    </>
  )
}
