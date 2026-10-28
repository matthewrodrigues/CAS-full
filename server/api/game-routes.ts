import { Hono, type Context } from 'hono'
import { deleteCookie } from 'hono/cookie'
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
  NewsletterOptinInput,
  StaffUpdateSettingsInput,
  SubmitAnswerInput,
  SubmitFeedbackInput,
  SubmitWagerInput,
} from '../../shared/api'
import type { GameErrorCode } from '../../shared/game'
import { clientIp } from '../auth/client-ip'
import { publicRoute, requireRole } from '../auth/guards'
import { createRateLimiter } from '../auth/rate-limit'
import { ensureGuestSession, linkSessionPlayer, SESSION_COOKIE } from '../auth/sessions'
import type { AppDeps, AppEnv } from '../context'
import type { GameResult } from '../game/context'
import { deleteAccount, eventSettings, newsletterCsv, optInToNewsletter, submitFeedback, updateSettings } from '../game/account'
import { joinEvent } from '../game/join'
import { myRewards, redeemCode, staffAwards } from '../game/rewards'
import { validate } from './validate'

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
  const staff = requireRole('staff')
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
      .get('/api/my_rewards', player, (c) => c.json({ rewards: playerId(c) ? myRewards(db, playerId(c)!) : [] }))
      .post('/api/submit_feedback', player, validate('json', SubmitFeedbackInput), (c) => {
        const id = playerId(c)
        if (!id) return c.json({ error: 'join_first' }, 409)
        const { event_id, rating, comment } = c.req.valid('json')
        return respond(c, submitFeedback(db, { eventId: event_id, playerId: id, rating, comment }))
      })
      .post('/api/newsletter_optin', player, validate('json', NewsletterOptinInput), (c) => {
        const id = playerId(c)
        if (!id) return c.json({ error: 'join_first' }, 409)
        const { email, topics } = c.req.valid('json')
        return respond(c, optInToNewsletter(db, { playerId: id, email, topics }))
      })
      .post('/api/delete_my_account', player, validate('json', EmptyInput), (c) => {
        const id = playerId(c)
        if (id) deleteAccount(db, id)
        deleteCookie(c, SESSION_COOKIE, { path: '/' })
        return c.json({ ok: true })
      })

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

      .post('/api/redeem_code', staff, validate('json', RedeemCodeInput), (c) => respond(c, redeemCode(db, c.req.valid('json').code)))
      .get('/api/staff_awards', staff, (c) => c.json({ awards: staffAwards(db) }))
      .get('/api/staff_newsletter_csv', staff, (c) => {
        c.header('content-disposition', 'attachment; filename="newsletter-optins.csv"')
        return c.body(newsletterCsv(db), 200, { 'content-type': 'text/csv; charset=utf-8' })
      })
      .get('/api/staff_event_settings', staff, validate('query', EventIdInput), (c) => respond(c, eventSettings(db, c.req.valid('query').event_id)))
      .post('/api/staff_update_settings', staff, validate('json', StaffUpdateSettingsInput), (c) => {
        const { event_id, settings } = c.req.valid('json')
        const result = updateSettings(db, event_id, settings)
        if (!result.ok && result.error === 'invalid_settings') return c.json({ error: 'invalid_settings', issues: result.issues }, 400)
        return respond(c, result as Exclude<typeof result, { error: 'invalid_settings' }>)
      })
  )
}
