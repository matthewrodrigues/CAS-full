import { useMutation } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HostStage } from '@/components/host-stage'
import { parseWager, wagerSoFar } from '@/game/answer-sheet'
import { hostExpression } from '@/game/cast'
import { useGameStore } from '@/game/store'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'
import { FieldError } from './field-error'
import { NoteIcon, ScreenTop } from './paper-parts'

/**
 * final_wager (design/screens/wager.html): the final round's host asks how much to bet, on a torn
 * sheet. Bet 0 up to the team's score; the last wager before the question opens wins.
 */
export function WagerScreen() {
  const { t } = useTranslation()
  const { live, playerId } = usePlay()
  const view = live.view!
  const team = view.my_team!
  const id = useId()
  const locked = view.submission?.wager ?? null
  const [amount, setAmount] = useState(locked !== null ? String(locked) : '')
  const [invalid, setInvalid] = useState(false)
  const setView = useGameStore((s) => s.setView)
  const readOnly = view.settings.team_submissions === 'captain_only' && team.captain_id !== playerId
  const canBet = team.score > 0
  const place = useMutation({
    mutationFn: (value: number) => api.submitWager({ event_question_id: view.state.current_event_question_id!, amount: value }),
    onSuccess: (submission) => {
      const current = useGameStore.getState().view
      if (current) setView({ ...current, submission })
    },
  })

  // A captain-only member's field shows the team's wager; it can't be typed in.
  const shownAmount = readOnly ? (locked !== null ? String(locked) : '') : amount
  const value = parseWager(shownAmount, team.score)
  const isLocked = value !== null && value === locked
  const soFar = wagerSoFar({ placed: locked, mine: value, readOnly })
  const send = () => {
    if (readOnly || isLocked || !canBet) return
    if (value === null) {
      setInvalid(amount.trim() !== '')
      return
    }
    place.mutate(value)
  }
  // The final round's host: the one taking over, or the current host when no round came before.
  const host = view.cast.incoming_host ?? view.cast.host
  const placed = locked !== null
  const headingId = `${id}-prompt`

  return (
    <>
      <ScreenTop status="wager" note={t('wager.finalRound')} />
      <HostStage host={host} expression={hostExpression(view)} line={t(placed ? 'host.lines.wagerSent' : 'host.lines.wager')} tone="peach" />

      <div className="paper-shadow">
        <article className="paper paper--torn" aria-labelledby={headingId}>
          <header className="paper__head">
            <div className="paper__meta">
              <p className="hand">{t('wager.title')}</p>
              <p className="small">{t('wager.subtitle')}</p>
            </div>
          </header>
          <div className="paper__body">
            <h1 className="question" id={headingId}>
              {t('wager.heading')}
            </h1>
            <p className="body">{t('wager.intro')}</p>
            <p className="tally">
              <span className="tally__num">{team.score}</span>
              <span className="tally__label">{t('wager.tallyLabel')}</span>
            </p>
            {canBet ? (
              <div className={isLocked ? 'field field--number field--submitted' : 'field field--number'}>
                <label className="field__label" htmlFor={id}>
                  {t('wager.ourLabel')}
                </label>
                <input
                  className="field__input"
                  id={id}
                  type="text"
                  value={shownAmount}
                  placeholder="0"
                  disabled={readOnly}
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="send"
                  aria-invalid={invalid || undefined}
                  aria-describedby={soFar !== null ? `${id}-foot ${id}-team` : `${id}-foot`}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setInvalid(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <div className="field__foot" id={`${id}-foot`}>
                  <span>{t('wager.foot', { max: team.score })}</span>
                </div>
                {soFar !== null ? (
                  <p className="small" id={`${id}-team`}>
                    <strong>{t('wager.teamSoFar', { amount: soFar })}</strong> <span className="tag">{t('question.sentTag')}</span>
                  </p>
                ) : null}
                {invalid ? (
                  <div role="alert">
                    <FieldError>{t('wager.invalid', { max: team.score })}</FieldError>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <div className="screen__actions">
        {readOnly ? (
          <p className="note">
            <NoteIcon>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
              <path d="M8.5 3.5 12 2l3.5 1.5" />
            </NoteIcon>
            <span>{t('wager.captainOnly')}</span>
          </p>
        ) : !canBet ? (
          <p className="note">
            <NoteIcon>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.5v.01" />
            </NoteIcon>
            <span>{t('wager.noPoints')}</span>
          </p>
        ) : (
          <>
            {place.error ? (
              <div role="alert">
                <FieldError>{errorMessage(errorCode(place.error), t)}</FieldError>
              </div>
            ) : null}
            {isLocked ? null : (
              <button type="button" className="btn btn--primary btn--block" disabled={amount.trim() === '' || place.isPending} onClick={send}>
                {placed ? t('wager.lockInstead') : t('wager.lock')}
              </button>
            )}
            {isLocked ? null : <p className="small muted center">{t('wager.hint')}</p>}
            <div role="status" aria-live="polite">
              {isLocked ? (
                <p className="note">
                  <NoteIcon>
                    <path d="M21 3 10 14" />
                    <path d="M21 3l-7 18-4-7-7-4z" />
                  </NoteIcon>
                  <span>{t('wager.noteSent')}</span>
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  )
}
