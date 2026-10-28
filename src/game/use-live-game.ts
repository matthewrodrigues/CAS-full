// Keeps this phone's view of the game current (docs/SPEC.md section 5, Real-time): get_state is
// the source of truth, refetched on load, on every socket (re)connect, on focus, when the page
// becomes visible again and when the network returns; socket pushes patch it in between.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import { connectSocket } from '@/lib/socket'
import { syncClock } from './clock'
import { applyMessage, useGameStore } from './store'

export const stateKey = (eventId: string) => ['state', eventId] as const

export function useLiveGame(eventId: string) {
  const queryClient = useQueryClient()
  const { view, offset, connected, setView, setOffset, setConnected } = useGameStore()
  const query = useQuery({ queryKey: stateKey(eventId), queryFn: () => api.getState(eventId), staleTime: 0 })

  useEffect(() => {
    if (query.data) setView(query.data)
  }, [query.data, setView])

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: stateKey(eventId) })
    const socket = connectSocket({
      eventId,
      onOpen() {
        setConnected(true)
        refresh()
      },
      onClose: () => setConnected(false),
      onMessage(message) {
        const current = useGameStore.getState().view
        if (!current) return refresh()
        const next = applyMessage(current, message)
        if (next.view !== current) setView(next.view)
        if (next.refetch) refresh()
      },
    })
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      socket.close()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [eventId, queryClient, setConnected, setView])

  useEffect(() => {
    syncClock(api.serverTime)
      .then(setOffset)
      .catch(() => setOffset(0))
  }, [setOffset])

  return {
    view: view ?? query.data,
    offset,
    connected,
    error: query.error,
    refresh: () => void queryClient.invalidateQueries({ queryKey: stateKey(eventId) }),
  }
}
