import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PublicGameState } from '../../shared/game'
import { announcement } from '@/game/announce'

/** Announces phase changes to screen readers, e.g. "Question 4 is live, 20 seconds". */
export function LiveRegion({ state }: { state: PublicGameState | undefined }) {
  const { t } = useTranslation()
  const previous = useRef<PublicGameState | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!state) return
    const said = announcement(previous.current, state, t)
    previous.current = state
    if (said) setText(said)
  }, [state, t])

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {text}
    </div>
  )
}
