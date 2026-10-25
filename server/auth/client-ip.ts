import type { IncomingMessage } from 'node:http'
import type { Context } from 'hono'

/**
 * The caller's IP for rate limiting. Behind the hosting proxy (Fly.io, Railway, Render) the
 * rightmost X-Forwarded-For entry is the one the proxy appended; entries to its left are
 * whatever the client sent. Without a proxy (local dev) it falls back to the socket address.
 */
export function clientIp(c: Context): string {
  const appended = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim()
  if (appended) return appended
  const incoming = (c.env as { incoming?: IncomingMessage } | undefined)?.incoming
  return incoming?.socket.remoteAddress ?? 'unknown'
}
