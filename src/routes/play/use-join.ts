// Getting this phone into the event: a returning player (session cookie with a player) is
// rejoined silently with their nickname; a new one picks a nickname first (SPEC section 5,
// join_event). Only a successful join creates the guest session.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'

export function useJoin(joinCode: string) {
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: Infinity, retry: 1 })
  const join = useMutation({
    mutationFn: (nickname: string) => api.joinEvent({ join_code: joinCode, nickname }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const resumed = useRef(false)
  const returning = me.data?.player

  useEffect(() => {
    if (returning && !resumed.current) {
      resumed.current = true
      join.mutate(returning.nickname)
    }
  }, [returning, join])

  const resuming = me.isPending || (!!returning && !join.data && !join.isError)
  return {
    status: join.data ? ('joined' as const) : resuming ? ('loading' as const) : ('nickname' as const),
    result: join.data,
    error: join.error,
    joining: join.isPending,
    join: (nickname: string) => join.mutate(nickname),
  }
}
