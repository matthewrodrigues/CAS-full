/** How long before the lock the "Don't forget to send!" nudge appears. */
export const NUDGE_MS = 5000

/**
 * The nudge: an unsent circle (or one that differs from what the team sent) in the last five
 * seconds, while answers are still open.
 */
export function shouldNudge(input: { circled: number | string | null; sent: number | string | null; msLeft: number; locked: boolean }): boolean {
  const { circled, sent, msLeft, locked } = input
  return !locked && msLeft > 0 && msLeft <= NUDGE_MS && circled !== null && circled !== sent
}

/**
 * The sheet's one primary button. `isSent`: my pick is what the team sent. `label`: "send" (first
 * time, disabled until something is picked), "send_instead" (a different pick, or text I've typed),
 * or none (already sent, or a teammate sent and I've picked nothing, so there's nothing to send).
 */
export function sheetButton<T extends number | string>(input: { picked: T | null; sent: T | null; hasInput: boolean }): { isSent: boolean; label: 'send' | 'send_instead' | null } {
  const { picked, sent, hasInput } = input
  if (picked !== null && picked === sent) return { isSent: true, label: null }
  if (sent === null) return { isSent: false, label: 'send' }
  return { isSent: false, label: hasInput ? 'send_instead' : null }
}

/** A player's own circle, tied to the question it was made on so it never leaks into the next one. */
export type Circle = { eventQuestionId: string; option: number } | null

/** Tapping only circles; nothing is sent. */
export function tapOption(eventQuestionId: string, option: number): Circle {
  return { eventQuestionId, option }
}

export function circledFor(circle: Circle, eventQuestionId: string): number | null {
  return circle !== null && circle.eventQuestionId === eventQuestionId ? circle.option : null
}

/**
 * Which host line goes with the sheet right now, as a key under `host.lines` (the caller
 * translates it). Paused beats everything; then the captain-only cheer; the nudge; "got it"
 * once the team has sent; otherwise a line for the kind of question.
 */
export function sheetLine(input: {
  type: 'mc' | 'true_false' | 'typed' | 'closest_number'
  mediaKind: 'none' | 'image' | 'audio'
  paused: boolean
  readOnly: boolean
  sent: boolean
  nudging: boolean
}): `question.${'mc' | 'true_false' | 'typed' | 'closest_number' | 'image' | 'audio' | 'sent' | 'nudge' | 'captainOnly' | 'paused'}` {
  if (input.paused) return 'question.paused'
  if (input.readOnly) return 'question.captainOnly'
  if (input.nudging) return 'question.nudge'
  if (input.sent) return 'question.sent'
  if (input.mediaKind !== 'none') return `question.${input.mediaKind}`
  return `question.${input.type}`
}

/** A wager is a whole number from 0 up to the team's score; null when it isn't. */
export function parseWager(text: string, max: number): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return value <= max ? value : null
}

/** How much of the ring is left (0 to 1), for the countdown's `--left`. */
export function ringLeft(msLeft: number, totalMs: number): number {
  if (totalMs <= 0) return 0
  return Math.min(1, Math.max(0, msLeft / totalMs))
}

/** The countdown's number: whole seconds left, rounded up, never more than the question allows (a clock a hair ahead mustn't show 21 on a 20 s question). */
export function ringSeconds(msLeft: number, totalMs: number): number {
  return Math.ceil(Math.min(Math.max(0, msLeft), Math.max(0, totalMs)) / 1000)
}
