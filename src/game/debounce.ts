/** Calls `fn` once, `ms` after the last call; `flush` runs a pending call now, `cancel` drops it. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: A | undefined

  const run = () => {
    clearTimeout(timer)
    timer = undefined
    const args = pending
    pending = undefined
    if (args) fn(...args)
  }

  return Object.assign(
    (...args: A) => {
      pending = args
      clearTimeout(timer)
      timer = setTimeout(run, ms)
    },
    {
      flush: run,
      cancel() {
        clearTimeout(timer)
        timer = undefined
        pending = undefined
      },
    },
  )
}
