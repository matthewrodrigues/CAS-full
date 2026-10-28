import { serve, type ServerType } from '@hono/node-server'
import { WebSocketServer } from 'ws'

type FetchHandler = Parameters<typeof serve>[0]['fetch']

/** How long a socket we have finished writing to may wait for the peer to close it. */
const CLOSE_GRACE_MS = 10_000

/** The one HTTP + WebSocket server (docs/SPEC.md section 2). Used by index.ts and by tests. */
export function startServer(fetch: FetchHandler, port: number, onListening?: (port: number) => void): ServerType {
  const server = serve({ fetch, port, websocket: { server: new WebSocketServer({ noServer: true }) } }, (info) => onListening?.(info.port))
  // When the server refuses a WebSocket upgrade (no session, foreign Origin, unknown event),
  // @hono/node-server ends the socket but leaves it paused and without an 'error' listener.
  // A client resetting the connection then is an uncaught exception that stops the process,
  // and a client that just closes is never noticed, so the socket leaks. Every socket gets an
  // error listener (Node still destroys it on error), and once our side has finished writing
  // it reads again so the peer's close is seen, with a destroy as the backstop.
  server.on('connection', (socket) => {
    socket.on('error', () => {})
    socket.on('finish', () => {
      socket.resume()
      setTimeout(() => socket.destroy(), CLOSE_GRACE_MS).unref()
    })
  })
  return server
}
