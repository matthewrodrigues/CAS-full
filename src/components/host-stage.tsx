import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Expression, Host } from '../../shared/characters'
import { hostLabel } from '@/game/cast'
import { Character, hostCharacter, type CharacterSize } from './character'

export type StageTone = 'peach' | 'butter' | 'sky'

export type HostStageProps = {
  host: Host
  expression: Expression
  /** The host's speech, already translated: `t('host.lines.…')`. */
  line: string
  /** peach (the default stage), butter (waiting, lobby, round break) or sky (results, the end). */
  tone: StageTone
  /**
   * The tall centered stage (`.stage--hero`): bubble above the character, then `children` (the
   * heading) under it. Without it, the character sits left and the bubble right (timed screens).
   */
  hero?: boolean
  /** Defaults to 160 on a hero stage and 96 otherwise (kit.md §11). */
  size?: CharacterSize
  /** The slow breathing loop. Never on a timed question. Defaults to `hero`. */
  idle?: boolean
  /** The id of the heading that names this stage; otherwise it's labelled "Your host". */
  labelledBy?: string
  children?: ReactNode
}

/** The host on a pastel stage with a speech bubble (kit.md §11). */
export function HostStage({ host, expression, line, tone, hero = false, size, idle = hero, labelledBy, children }: HostStageProps) {
  const { t } = useTranslation()
  const className = ['stage', tone === 'peach' ? null : `stage--${tone}`, hero ? 'stage--hero' : null].filter(Boolean).join(' ')
  const label = hostLabel(t, host, expression)
  const character = <Character name={hostCharacter(host, expression)} size={size ?? (hero ? 160 : 96)} label={label} idle={idle} />
  const sectionLabel = labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': t('host.stageLabel') }

  return (
    <section className={className} {...sectionLabel}>
      {hero ? (
        <>
          <p className="bubble bubble--down">{line}</p>
          {character}
        </>
      ) : (
        <>
          {character}
          <p className="bubble">{line}</p>
        </>
      )}
      {children}
    </section>
  )
}
