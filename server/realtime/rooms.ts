// WebSocket rooms (docs/SPEC.md section 5): every connection is in its event's room, players
// on a team are also in that team's room, and host or staff connections are in the host room.
// Kept in memory, which is fine because there is only ever one server instance.
import type { ServerMessage } from '../../shared/messages'

export type Connection = { send(data: string): void }
export type Member = { eventId: string; playerId: string | null; teamId: string | null; isHost: boolean }
export type Realtime = ReturnType<typeof createRealtime>

export function createRealtime() {
  const members = new Map<Connection, Member>()
  const listeners: ((eventId: string) => void)[] = []
  const notify = (eventId: string) => listeners.forEach((listener) => listener(eventId))

  function remove(conn: Connection) {
    const member = members.get(conn)
    if (!member) return
    members.delete(conn)
    notify(member.eventId)
  }

  function deliver(match: (member: Member) => boolean, message: ServerMessage) {
    const data = JSON.stringify(message)
    for (const [conn, member] of [...members]) {
      if (!match(member)) continue
      try {
        conn.send(data)
      } catch {
        remove(conn) // the socket is gone; its onClose may never come
      }
    }
  }

  return {
    /** Registers a connection; call the returned function when it closes. */
    add(conn: Connection, member: Member): () => void {
      members.set(conn, { ...member })
      notify(member.eventId)
      return () => remove(conn)
    },
    /** Moves a player's open connections into their (new) team's room. */
    setTeam(eventId: string, playerId: string, teamId: string | null) {
      for (const member of members.values()) {
        if (member.eventId === eventId && member.playerId === playerId) member.teamId = teamId
      }
      notify(eventId)
    },
    toEvent: (eventId: string, message: ServerMessage) => deliver((m) => m.eventId === eventId, message),
    toTeam: (teamId: string, message: ServerMessage) => deliver((m) => m.teamId === teamId, message),
    toHosts: (eventId: string, message: ServerMessage) => deliver((m) => m.eventId === eventId && m.isHost, message),
    connectedTeams(eventId: string): number {
      const teams = new Set<string>()
      for (const m of members.values()) if (m.eventId === eventId && m.teamId) teams.add(m.teamId)
      return teams.size
    },
    onPresence(listener: (eventId: string) => void) {
      listeners.push(listener)
    },
  }
}
