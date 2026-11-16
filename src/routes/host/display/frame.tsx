import type { ReactNode } from 'react'
import { StatusPill, type PillStatus } from '@/components/status-pill'

/**
 * One 1920x1080 screen of the room display (design/screens/big-*.html): the status pill and a
 * line of hand-lettered context on top, the host's stage on the left, and `children` in the
 * paper column on the right. The page puts `.big` on the body so the kit scales everything.
 */
export function BigFrame({ pill, note, stage, children }: { pill: PillStatus; note: string; stage: ReactNode; children: ReactNode }) {
  return (
    <main className="screen screen--big screen--night">
      <div className="screen__top">
        <StatusPill status={pill} />
        <p className="hand hand--night">{note}</p>
      </div>
      {stage}
      <div className="big-col">{children}</div>
    </main>
  )
}
