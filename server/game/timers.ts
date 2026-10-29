/** One pending auto-lock per event. In-process, so a restart re-arms them from the database. */
export function createTimers() {
  const pending = new Map<string, ReturnType<typeof setTimeout>>()

  function disarm(eventId: string) {
    clearTimeout(pending.get(eventId))
    pending.delete(eventId)
  }

  return {
    arm(eventId: string, at: number, fire: () => void) {
      disarm(eventId)
      pending.set(
        eventId,
        setTimeout(
          () => {
            pending.delete(eventId)
            fire()
          },
          Math.max(0, at - Date.now()),
        ),
      )
    },
    disarm,
    disarmAll() {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    },
  }
}

export type Timers = ReturnType<typeof createTimers>
