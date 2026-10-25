import { Hono, type Context } from 'hono'
import {
  CreateTeamInput,
  EmptyInput,
  EventIdInput,
  HostAdjustScoreInput,
  HostOverrideInput,
  JoinEventInput,
  JoinTeamInput,
  RedeemCodeInput,
  SubmitAnswerInput,
  SubmitWagerInput,
} from '../../shared/api'
import { publicRoute, requireRole } from '../auth/guards'
import { ensureGuestSession, linkSessionPlayer } from '../auth/sessions'
import type { AppDeps, AppEnv } from '../context'
import { joinEvent } from '../game/join'
import { getState } from '../game/state'
import { validate } from './validate'

/** Operations whose rules arrive with the game engine in Milestone 2. */
const notImplemented = (operation: string) => (c: Context) => c.json({ error: 'not_implemented', operation }, 501)

/**
 * The whole game interface (docs/SPEC.md section 5): GET for reads, POST for the rest.
 * Every route runs guard → zod validation → handler, and handlers only call into server/game/.
 */
export function createGameRoutes(deps: AppDeps) {
  const { db } = deps
  const host = requireRole('host')
  const player = requireRole('player')

  return (
    new Hono<AppEnv>()
      .get('/api/server_time', publicRoute(), (c) => c.json({ now: Date.now() }))
      .post('/api/join_event', publicRoute(), validate('json', JoinEventInput), (c) => {
        const { join_code, nickname } = c.req.valid('json')
        const result = joinEvent(db, { joinCode: join_code, nickname, playerId: c.get('session')?.playerId ?? null })
        if (!result.ok) return c.json({ error: result.error }, result.error === 'not_found' ? 404 : 409)
        // Only a successful join creates the guest session cookie.
        const session = ensureGuestSession(c, deps)
        if (session.playerId !== result.value.player.id) linkSessionPlayer(db, session.id, result.value.player.id)
        return c.json(result.value)
      })
      .get('/api/get_state', player, validate('query', EventIdInput), (c) => {
        const result = getState(db, { eventId: c.req.valid('query').event_id, playerId: c.get('session')?.playerId ?? null })
        return result ? c.json(result) : c.json({ error: 'not_found' }, 404)
      })

      .post('/api/create_team', player, validate('json', CreateTeamInput), notImplemented('create_team'))
      .post('/api/join_team', player, validate('json', JoinTeamInput), notImplemented('join_team'))
      .post('/api/submit_answer', player, validate('json', SubmitAnswerInput), notImplemented('submit_answer'))
      .post('/api/submit_wager', player, validate('json', SubmitWagerInput), notImplemented('submit_wager'))
      .post('/api/delete_my_account', player, validate('json', EmptyInput), notImplemented('delete_my_account'))

      .post('/api/host_open_question', host, validate('json', EventIdInput), notImplemented('host_open_question'))
      .post('/api/host_lock', host, validate('json', EventIdInput), notImplemented('host_lock'))
      .post('/api/host_reveal', host, validate('json', EventIdInput), notImplemented('host_reveal'))
      .post('/api/host_next', host, validate('json', EventIdInput), notImplemented('host_next'))
      .post('/api/host_pause', host, validate('json', EventIdInput), notImplemented('host_pause'))
      .post('/api/host_resume', host, validate('json', EventIdInput), notImplemented('host_resume'))
      .post('/api/host_skip', host, validate('json', EventIdInput), notImplemented('host_skip'))
      .post('/api/host_override', host, validate('json', HostOverrideInput), notImplemented('host_override'))
      .post('/api/host_adjust_score', host, validate('json', HostAdjustScoreInput), notImplemented('host_adjust_score'))

      .post('/api/redeem_code', requireRole('staff'), validate('json', RedeemCodeInput), notImplemented('redeem_code'))
  )
}
