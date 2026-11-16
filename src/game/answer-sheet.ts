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
