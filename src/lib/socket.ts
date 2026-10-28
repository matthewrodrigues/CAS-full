// One WebSocket per page to /ws (docs/SPEC.md section 5, Real-time). It reconnects with
// exponential backoff and jitter, so a whole room of phones doesn't reconnect in lockstep after
// a Wi-Fi blip. Callers treat it as a hint channel and refetch get_state on every (re)connect.
import type { ServerMessage } from '../../shared/messages'

const PING_MS = 25_000

/** 0.5 s, 1 s, 2 s, … up to 10 s, each scaled by a random 50–100%. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  return Math.min(10_000, 500 * 2 ** attempt) * (0.5 + random() / 2)
}

export function connectSocket({
  eventId,
  onMessage,
  onOpen,
  onClose,
}: {
  eventId: string
  onMessage(message: ServerMessage): void
  onOpen?(): void
  onClose?(): void
}): { close(): void } {
  let socket: WebSocket | null = null
  let attempt = 0
  let closed = false
  let retry: ReturnType<typeof setTimeout> | undefined
  let ping: ReturnType<typeof setInterval> | undefined

  const open = () => {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${scheme}://${location.host}/ws?event_id=${encodeURIComponent(eventId)}`)
    socket.onopen = () => {
      attempt = 0
      ping = setInterval(() => socket?.send(JSON.stringify({ type: 'ping' })), PING_MS)
      onOpen?.()
    }
    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(String(event.data)) as ServerMessage)
      } catch {
        // Not JSON: ignore it; the next get_state brings the truth.
      }
    }
    socket.onclose = () => {
      clearInterval(ping)
      onClose?.()
      if (!closed) retry = setTimeout(open, backoffDelay(attempt++))
    }
  }

  open()
  return {
    close() {
      closed = true
      clearTimeout(retry)
      clearInterval(ping)
      socket?.close()
    },
  }
}
