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

/** Which send button to show: none when nothing is circled, or the circle is already what the team sent. */
export function sendLabel<T extends number | string>(circled: T | null, sent: T | null): 'send' | 'send_instead' | null {
  if (circled === null || circled === sent) return null
  return sent === null ? 'send' : 'send_instead'
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
