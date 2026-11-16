import { useTranslation } from 'react-i18next'
import { HostStage } from '@/components/host-stage'
import { bigExpression } from '@/game/big-screen'
import { BigFrame } from './frame'
import type { PhaseProps } from './question'

/** The final wager: the host asks the room to place its bets on their phones. */
export function Wager({ view, paused }: PhaseProps) {
  const { t } = useTranslation()
  const stage = (
    <HostStage host={view.cast.host} expression={paused ? bigExpression('paused') : bigExpression('final_wager')} line={paused ? t('host.lines.bigPaused') : t('host.lines.bigWager')} tone="peach" hero size={400} />
  )
  return (
    <BigFrame pill={paused ? 'paused' : 'wager'} note={t('display.late', { round: t('display.wager'), code: view.event.join_code })} stage={stage}>
      <article className="paper" aria-labelledby="wager-title">
        <div className="paper__body">
          <h1 className="display" id="wager-title">
            {t('display.wager')}
          </h1>
          <p className="h2 muted">{t('display.wagerBody')}</p>
        </div>
      </article>
    </BigFrame>
  )
}
