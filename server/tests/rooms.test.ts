import { beforeEach, describe, expect, it } from 'vitest'
import type { ServerMessage } from '../../shared/messages'
import { createRealtime, type Realtime } from '../realtime/rooms'

function recorder() {
  const received: ServerMessage[] = []
  return { received, send: (data: string) => void received.push(JSON.parse(data)) }
}

const ping: ServerMessage = { type: 'pong' }
let rt: Realtime

beforeEach(() => {
  rt = createRealtime()
})

describe('realtime rooms', () => {
  it('sends event messages only to connections for that event', () => {
    const a = recorder()
    const other = recorder()
    rt.add(a, { eventId: 'e1', playerId: 'p1', teamId: null, isHost: false })
    rt.add(other, { eventId: 'e2', playerId: 'p2', teamId: null, isHost: false })

    rt.toEvent('e1', ping)

    expect(a.received).toEqual([ping])
    expect(other.received).toEqual([])
  })

  it("sends team messages only to that team's connections", () => {
    const teamA = recorder()
    const teamB = recorder()
    rt.add(teamA, { eventId: 'e1', playerId: 'p1', teamId: 'A', isHost: false })
    rt.add(teamB, { eventId: 'e1', playerId: 'p2', teamId: 'B', isHost: false })

    rt.toTeam('A', { type: 'teams' })

    expect(teamA.received).toEqual([{ type: 'teams' }])
    expect(teamB.received).toEqual([])
  })

  it('sends host messages only to host connections of that event', () => {
    const host = recorder()
    const player = recorder()
    const otherHost = recorder()
    rt.add(host, { eventId: 'e1', playerId: null, teamId: null, isHost: true })
    rt.add(player, { eventId: 'e1', playerId: 'p1', teamId: 'A', isHost: false })
    rt.add(otherHost, { eventId: 'e2', playerId: null, teamId: null, isHost: true })

    rt.toHosts('e1', { type: 'host_stats', connected_teams: 1, answered_teams: 0 })

    expect(host.received).toHaveLength(1)
    expect(player.received).toEqual([])
    expect(otherHost.received).toEqual([])
  })

  it("moves a player's open connections when they join a team", () => {
    const phone = recorder()
    const laptop = recorder()
    rt.add(phone, { eventId: 'e1', playerId: 'p1', teamId: null, isHost: false })
    rt.add(laptop, { eventId: 'e1', playerId: 'p1', teamId: null, isHost: false })

    rt.setTeam('e1', 'p1', 'A')
    rt.toTeam('A', ping)

    expect(phone.received).toEqual([ping])
    expect(laptop.received).toEqual([ping])
  })

  it('counts distinct teams with at least one open connection', () => {
    const one = rt.add(recorder(), { eventId: 'e1', playerId: 'p1', teamId: 'A', isHost: false })
    rt.add(recorder(), { eventId: 'e1', playerId: 'p2', teamId: 'A', isHost: false })
    rt.add(recorder(), { eventId: 'e1', playerId: 'p3', teamId: 'B', isHost: false })
    rt.add(recorder(), { eventId: 'e1', playerId: 'p4', teamId: null, isHost: false })
    rt.add(recorder(), { eventId: 'e2', playerId: 'p5', teamId: 'C', isHost: false })
    expect(rt.connectedTeams('e1')).toBe(2)

    one()
    expect(rt.connectedTeams('e1')).toBe(2)
  })

  it('reports presence changes for the event', () => {
    const changes: string[] = []
    rt.onPresence((eventId) => changes.push(eventId))
    const remove = rt.add(recorder(), { eventId: 'e1', playerId: 'p1', teamId: null, isHost: false })
    rt.setTeam('e1', 'p1', 'A')
    remove()
    expect(changes).toEqual(['e1', 'e1', 'e1'])
  })

  it('drops a connection whose send throws and still delivers to the rest', () => {
    const healthy = recorder()
    rt.add(
      {
        send: () => {
          throw new Error('socket closed')
        },
      },
      { eventId: 'e1', playerId: 'p1', teamId: 'A', isHost: false },
    )
    rt.add(healthy, { eventId: 'e1', playerId: 'p2', teamId: 'B', isHost: false })

    rt.toEvent('e1', ping)

    expect(healthy.received).toEqual([ping])
    expect(rt.connectedTeams('e1')).toBe(1)
  })
})
