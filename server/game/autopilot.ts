// The demo autopilot (docs/superpowers/specs/2026-11-17-demo-quickstart-design.md): once a phase
// settles it presses the host's next button for them after a pause. In memory only, so a server
// restart turns it off. It never starts the game and never cuts a live question short (those lock
// themselves on their own timer).
import type { Phase } from '../../shared/enums'

export type AutopilotOp = 'reveal' | 'next'

export const AUTOPILOT_DELAYS_MS: Readonly<Partial<Record<Phase, number>>> = {
  locked: 3000,
  final_locked: 3000,
  revealed: 8000,
  round_break: 12000,
  final_wager: 30000,
  final_revealed: 10000,
}

/** What autopilot does after `phase` settles, or null when it waits for something else. */
export function autopilotStep(phase: Phase): { op: AutopilotOp; delayMs: number } | null {
  const delayMs = AUTOPILOT_DELAYS_MS[phase]
  if (delayMs === undefined) return null
  return { op: phase === 'locked' || phase === 'final_locked' ? 'reveal' : 'next', delayMs }
}

export type Autopilot = {
  isOn(eventId: string): boolean
  set(eventId: string, on: boolean): void
  /** Called on every phase change: drops any pending step and, if on, schedules the next one. */
  onPhase(eventId: string, phase: Phase): void
  cancel(eventId: string): void
  stop(): void
}

/** `overrideDelayMs` replaces every delay (e2e runs). */
export function createAutopilot(act: (eventId: string, op: AutopilotOp) => void, overrideDelayMs?: number): Autopilot {
  const on = new Set<string>()
  const pending = new Map<string, ReturnType<typeof setTimeout>>()

  const cancel = (eventId: string) => {
    clearTimeout(pending.get(eventId))
    pending.delete(eventId)
  }

  return {
    isOn: (eventId) => on.has(eventId),
    set(eventId, value) {
      if (value) on.add(eventId)
      else {
        on.delete(eventId)
        cancel(eventId)
      }
    },
    onPhase(eventId, phase) {
      cancel(eventId)
      if (!on.has(eventId)) return
      const step = autopilotStep(phase)
      if (!step) return
      pending.set(
        eventId,
        setTimeout(() => {
          pending.delete(eventId)
          act(eventId, step.op)
        }, overrideDelayMs ?? step.delayMs),
      )
    },
    cancel,
    stop() {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
      on.clear()
    },
  }
}
