import { Hono, type Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  CreateTeamInput,
  EmptyInput,
  EventIdInput,
  HostAdjustScoreInput,
  HostOverrideInput,
  HostReviewTeamNameInput,
  JoinEventInput,
  JoinTeamInput,
  RedeemCodeInput,
  SubmitAnswerInput,
  SubmitWagerInput,
} from '../../shared/api'
import type { GameErrorCode } from '../../shared/game'
import { clientIp } from '../auth/client-ip'
import { publicRoute, requireRole } from '../auth/guards'
import { createRateLimiter } from '../auth/rate-limit'
import { ensureGuestSession, linkSessionPlayer } from '../auth/sessions'
import type { AppDeps, AppEnv } from '../context'
import type { GameResult } from '../game/context'
import { joinEvent } from '../game/join'
import { validate } from './validate'

/** Operations that arrive with Milestone 6 (rewards and account deletion). */
const notImplemented = (operation: string) => (c: Context) => c.json({ error: 'not_implemented', operation }, 501)

/** Everything not listed is a conflict with the game's current state: 409. */
const STATUS: Partial<Record<GameErrorCode, ContentfulStatusCode>> = {
  not_found: 404,
  not_on_team: 403,
  captain_only: 403,
  wrong_answer_type: 400,
  wager_too_high: 400,
  name_not_allowed: 400,
  nickname_not_allowed: 400,
  rate_limited: 429,
}

function respond<T>(c: Context<AppEnv>, result: GameResult<T>) {
  return result.ok ? c.json(result.value as object) : c.json({ error: result.error }, STATUS[result.error] ?? 409)
}

/**
 * The whole game interface (docs/SPEC.md section 5): GET for reads, POST for the rest.
 * Every route runs guard → zod validation → handler, and handlers only call into server/game/.
 */
export function createGameRoutes(deps: AppDeps) {
  const { db, game } = deps
  const host = requireRole('host')
  const player = requireRole('player')
  // Stops a script creating endless players; a whole crowd behind the venue's NAT stays under it.
  const newPlayers = createRateLimiter({ max: 200, windowMs: 60_000 })
  const playerId = (c: Context<AppEnv>) => c.get('session')?.playerId ?? null

  return (
    new Hono<AppEnv>()
      .get('/api/server_time', publicRoute(), (c) => c.json({ now: Date.now() }))
      .post('/api/join_event', publicRoute(), validate('json', JoinEventInput), (c) => {
        const { join_code, nickname } = c.req.valid('json')
        const existing = playerId(c)
        if (!existing && !newPlayers.attempt(clientIp(c)).ok) return c.json({ error: 'rate_limited' }, 429)
        const result = joinEvent(db, { joinCode: join_code, nickname, playerId: existing })
        if (!result.ok) return c.json({ error: result.error }, STATUS[result.error] ?? 409)
        // Only a successful join creates the guest session cookie.
        const session = ensureGuestSession(c, deps)
        if (session.playerId !== result.value.player.id) linkSessionPlayer(db, session.id, result.value.player.id)
        return c.json(result.value)
      })
      .get('/api/get_state', player, validate('query', EventIdInput), (c) => {
        const session = c.get('session')!
        const view = game.getState({ eventId: c.req.valid('query').event_id, playerId: session.playerId, isHost: session.role !== 'player' })
        return view ? c.json(view) : c.json({ error: 'not_found' }, 404)
      })
      .get('/api/get_leaderboard', player, validate('query', EventIdInput), (c) => {
        const session = c.get('session')!
        const board = game.leaderboard({ eventId: c.req.valid('query').event_id, playerId: session.playerId, isHost: session.role !== 'player' })
        return board ? c.json(board) : c.json({ error: 'not_found' }, 404)
      })

      .post('/api/create_team', player, validate('json', CreateTeamInput), (c) => {
        const { event_id, name } = c.req.valid('json')
        return respond(c, game.createTeam({ eventId: event_id, playerId: playerId(c), name }))
      })
      .post('/api/join_team', player, validate('json', JoinTeamInput), (c) =>
        respond(c, game.joinTeam({ teamId: c.req.valid('json').team_id, playerId: playerId(c) })),
      )
      .post('/api/submit_answer', player, validate('json', SubmitAnswerInput), (c) => {
        const { event_question_id, answer, is_draft } = c.req.valid('json')
        return respond(c, game.submitAnswer({ eventQuestionId: event_question_id, playerId: playerId(c), answer, isDraft: is_draft }))
      })
      .post('/api/submit_wager', player, validate('json', SubmitWagerInput), (c) => {
        const { event_question_id, amount } = c.req.valid('json')
        return respond(c, game.submitWager({ eventQuestionId: event_question_id, playerId: playerId(c), amount }))
      })
      .post('/api/delete_my_account', player, validate('json', EmptyInput), notImplemented('delete_my_account'))

      .get('/api/host_events', host, (c) => c.json({ events: game.hostEvents() }))
      .post('/api/host_open_question', host, validate('json', EventIdInput), (c) => respond(c, game.openQuestion(c.req.valid('json').event_id)))
      .post('/api/host_lock', host, validate('json', EventIdInput), (c) => respond(c, game.lock(c.req.valid('json').event_id)))
      .post('/api/host_reveal', host, validate('json', EventIdInput), (c) => respond(c, game.reveal(c.req.valid('json').event_id)))
      .post('/api/host_next', host, validate('json', EventIdInput), (c) => respond(c, game.next(c.req.valid('json').event_id)))
      .post('/api/host_pause', host, validate('json', EventIdInput), (c) => respond(c, game.pause(c.req.valid('json').event_id)))
      .post('/api/host_resume', host, validate('json', EventIdInput), (c) => respond(c, game.resume(c.req.valid('json').event_id)))
      .post('/api/host_skip', host, validate('json', EventIdInput), (c) => respond(c, game.skip(c.req.valid('json').event_id)))
      .post('/api/host_override', host, validate('json', HostOverrideInput), (c) => {
        const { submission_id, result, note } = c.req.valid('json')
        return respond(c, game.override({ submissionId: submission_id, result, note }))
      })
      .post('/api/host_adjust_score', host, validate('json', HostAdjustScoreInput), (c) => {
        const { team_id, points, note } = c.req.valid('json')
        return respond(c, game.adjustScore({ teamId: team_id, points, note }))
      })
      .post('/api/host_review_team_name', host, validate('json', HostReviewTeamNameInput), (c) => {
        const { team_id, name_status } = c.req.valid('json')
        return respond(c, game.reviewTeamName({ teamId: team_id, nameStatus: name_status }))
      })

      .post('/api/redeem_code', requireRole('staff'), validate('json', RedeemCodeInput), notImplemented('redeem_code'))
  )
}
