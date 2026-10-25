// The only place tables are defined (docs/SPEC.md section 4).
// After changing this file, run `npm run db:generate`, then `npm run db:migrate`.
//
// Conventions: TEXT UUID ids, INTEGER Unix-ms timestamps, INTEGER 0/1 booleans, JSON stored
// as TEXT, and a CHECK constraint on every enum column. Delete policy: an event's own rows
// cascade with it; content (seasons, themes, questions, rewards) can't be deleted while in
// use; deleting a player removes their personal rows but keeps team scores (delete_my_account).
import { sql, type SQL } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core'
import {
  AUTO_RESULTS,
  AWARD_STATUSES,
  DISPLAY_MODES,
  EVENT_STATUSES,
  GAME_PHASES,
  MEDIA_KINDS,
  NAME_STATUSES,
  OVERRIDE_RESULTS,
  PHASES,
  QUESTION_TYPES,
  ROLES,
  ROUND_FORMATS,
  SCORE_REASONS,
} from '../../shared/enums'
import type { Answer } from '../../shared/api'
import type { EventSettings } from '../../shared/settings'

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

/**
 * `column IN (...)`. drizzle-kit drops bound parameters when it writes CHECK SQL, so the
 * values are inlined as literals. They come only from the constant lists in shared/enums.ts.
 */
function oneOf(column: AnySQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(', '))})`
}

export const seasons = sqliteTable('seasons', {
  id: id(),
  name: text('name').notNull(),
  // Calendar dates (YYYY-MM-DD), not instants.
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
})

export const themes = sqliteTable('themes', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  badgeImageUrl: text('badge_image_url'),
  accentToken: text('accent_token').notNull(),
})

export const events = sqliteTable(
  'events',
  {
    id: id(),
    seasonId: text('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'restrict' }),
    themeId: text('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'restrict' }),
    startsAt: integer('starts_at').notNull(),
    joinCode: text('join_code').notNull().unique(),
    status: text('status', { enum: EVENT_STATUSES }).notNull().default('draft'),
    settings: text('settings', { mode: 'json' }).$type<EventSettings>().notNull(),
  },
  (t) => [
    check('events_status_check', oneOf(t.status, EVENT_STATUSES)),
    check(
      'events_join_code_check',
      sql`length(${t.joinCode}) between 4 and 5 and ${t.joinCode} not glob '*[^A-Z0-9]*'`,
    ),
  ],
)

export const rounds = sqliteTable(
  'rounds',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    format: text('format', { enum: ROUND_FORMATS }).notNull(),
  },
  (t) => [
    check('rounds_format_check', oneOf(t.format, ROUND_FORMATS)),
    unique('rounds_event_position_unique').on(t.eventId, t.position),
    // "Must be last" needs other rows, so content-rules.ts checks it; SQLite can enforce "at most one".
    uniqueIndex('rounds_one_wager_per_event').on(t.eventId).where(sql`${t.format} = 'wager'`),
  ],
)

export const questions = sqliteTable(
  'questions',
  {
    id: id(),
    themeId: text('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'restrict' }),
    type: text('type', { enum: QUESTION_TYPES }).notNull(),
    prompt: text('prompt').notNull(),
    options: text('options', { mode: 'json' }).$type<string[]>(),
    mediaKind: text('media_kind', { enum: MEDIA_KINDS }).notNull().default('none'),
    mediaUrl: text('media_url'),
    caption: text('caption'),
    funFact: text('fun_fact'),
    difficulty: integer('difficulty'),
    author: text('author'),
  },
  (t) => [
    check('questions_type_check', oneOf(t.type, QUESTION_TYPES)),
    check('questions_media_kind_check', oneOf(t.mediaKind, MEDIA_KINDS)),
    check('questions_media_url_check', sql`(${t.mediaKind} = 'none') = (${t.mediaUrl} is null)`),
    check('questions_difficulty_check', sql`${t.difficulty} between 1 and 3`),
  ],
)

/** Never sent to a client. Only scoring and the reveal-payload builder read it (CLAUDE.md). */
export const questionAnswers = sqliteTable('question_answers', {
  questionId: text('question_id')
    .primaryKey()
    .references(() => questions.id, { onDelete: 'cascade' }),
  acceptedAnswers: text('accepted_answers', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  // 0-based index into questions.options; for true_false, 0 = True and 1 = False.
  correctOption: integer('correct_option'),
  numericAnswer: real('numeric_answer'),
})

export const eventQuestions = sqliteTable(
  'event_questions',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    roundId: text('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    durationS: integer('duration_s').notNull(),
    points: integer('points').notNull(),
  },
  (t) => [
    unique('event_questions_round_position_unique').on(t.roundId, t.position),
    unique('event_questions_event_question_unique').on(t.eventId, t.questionId),
    check('event_questions_duration_s_check', sql`${t.durationS} > 0`),
    check('event_questions_points_check', sql`${t.points} >= 0`),
  ],
)

export const gameState = sqliteTable(
  'game_state',
  {
    eventId: text('event_id')
      .primaryKey()
      .references(() => events.id, { onDelete: 'cascade' }),
    phase: text('phase', { enum: PHASES }).notNull().default('lobby'),
    currentEventQuestionId: text('current_event_question_id').references(() => eventQuestions.id, {
      onDelete: 'set null',
    }),
    opensAt: integer('opens_at'),
    closesAt: integer('closes_at'),
    pausedAt: integer('paused_at'),
    pausedFromPhase: text('paused_from_phase', { enum: GAME_PHASES }),
    livePayload: text('live_payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    revealPayload: text('reveal_payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (t) => [
    check('game_state_phase_check', oneOf(t.phase, PHASES)),
    check('game_state_paused_from_phase_check', oneOf(t.pausedFromPhase, GAME_PHASES)),
  ],
)

export const players = sqliteTable(
  'players',
  {
    id: id(),
    nickname: text('nickname').notNull(),
    displayMode: text('display_mode', { enum: DISPLAY_MODES }).notNull().default('nickname'),
    extraTimeS: integer('extra_time_s').notNull().default(0),
  },
  (t) => [
    check('players_display_mode_check', oneOf(t.displayMode, DISPLAY_MODES)),
    check('players_extra_time_s_check', sql`${t.extraTimeS} >= 0`),
  ],
)

export const teams = sqliteTable(
  'teams',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    captainId: text('captain_id').references(() => players.id, { onDelete: 'set null' }),
    nameStatus: text('name_status', { enum: NAME_STATUSES }).notNull().default('pending'),
  },
  (t) => [
    check('teams_name_status_check', oneOf(t.nameStatus, NAME_STATUSES)),
    // Target of team_members' composite foreign key.
    unique('teams_id_event_unique').on(t.id, t.eventId),
    uniqueIndex('teams_event_name_unique').on(t.eventId, sql`lower(${t.name})`),
  ],
)

export const teamMembers = sqliteTable(
  'team_members',
  {
    teamId: text('team_id').notNull(),
    // Copied from the team so (event_id, player_id) can be unique: one team per player per event.
    eventId: text('event_id').notNull(),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.playerId] }),
    unique('team_members_event_player_unique').on(t.eventId, t.playerId),
    foreignKey({ columns: [t.teamId, t.eventId], foreignColumns: [teams.id, teams.eventId] }).onDelete('cascade'),
  ],
)

export const submissions = sqliteTable(
  'submissions',
  {
    id: id(),
    eventQuestionId: text('event_question_id')
      .notNull()
      .references(() => eventQuestions.id, { onDelete: 'cascade' }),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    // Null until the team answers (a wager can arrive first in final_wager).
    answer: text('answer', { mode: 'json' }).$type<Answer>(),
    updatedBy: text('updated_by').references(() => players.id, { onDelete: 'set null' }),
    receivedAt: integer('received_at').notNull(),
    isDraft: integer('is_draft', { mode: 'boolean' }).notNull().default(false),
    autoResult: text('auto_result', { enum: AUTO_RESULTS }),
    overrideResult: text('override_result', { enum: OVERRIDE_RESULTS }),
    wager: integer('wager'),
    // closest_number only: |answer - numeric_answer|, also the tiebreaker (section 5).
    distance: real('distance'),
  },
  (t) => [
    unique('submissions_question_team_unique').on(t.eventQuestionId, t.teamId),
    check('submissions_is_draft_check', sql`${t.isDraft} in (0, 1)`),
    check('submissions_auto_result_check', oneOf(t.autoResult, AUTO_RESULTS)),
    check('submissions_override_result_check', oneOf(t.overrideResult, OVERRIDE_RESULTS)),
    check('submissions_wager_check', sql`${t.wager} >= 0`),
  ],
)

export const scoreEvents = sqliteTable(
  'score_events',
  {
    id: id(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    eventQuestionId: text('event_question_id').references(() => eventQuestions.id, { onDelete: 'cascade' }),
    points: integer('points').notNull(),
    reason: text('reason', { enum: SCORE_REASONS }).notNull(),
    note: text('note'),
  },
  (t) => [
    check('score_events_reason_check', oneOf(t.reason, SCORE_REASONS)),
    // Manual adjustments always carry a reason. coalesce: a NULL check result would pass.
    check('score_events_adjust_note_check', sql`${t.reason} <> 'adjust' or coalesce(length(trim(${t.note})), 0) > 0`),
  ],
)

export const badges = sqliteTable('badges', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
})

export const playerBadges = sqliteTable(
  'player_badges',
  {
    badgeId: text('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    earnedAt: integer('earned_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.badgeId, t.playerId] })],
)

export const rewards = sqliteTable(
  'rewards',
  {
    id: id(),
    name: text('name').notNull(),
    // 1 is the most valuable.
    tier: integer('tier').notNull(),
    description: text('description'),
    expiresAfterDays: integer('expires_after_days').notNull(),
    perPersonLimit: integer('per_person_limit').notNull().default(1),
  },
  (t) => [
    check('rewards_tier_check', sql`${t.tier} >= 1`),
    check('rewards_expires_after_days_check', sql`${t.expiresAfterDays} > 0`),
    check('rewards_per_person_limit_check', sql`${t.perPersonLimit} >= 1`),
  ],
)

export const rewardAwards = sqliteTable(
  'reward_awards',
  {
    id: id(),
    rewardId: text('reward_id')
      .notNull()
      .references(() => rewards.id, { onDelete: 'restrict' }),
    playerId: text('player_id').references(() => players.id, { onDelete: 'set null' }),
    code: text('code').notNull().unique(),
    status: text('status', { enum: AWARD_STATUSES }).notNull().default('issued'),
    issuedAt: integer('issued_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    // Staff have no accounts; the redeem page (Milestone 6) decides what goes here.
    redeemedBy: text('redeemed_by'),
    redeemedAt: integer('redeemed_at'),
  },
  (t) => [
    check('reward_awards_status_check', oneOf(t.status, AWARD_STATUSES)),
    check('reward_awards_code_check', sql`length(${t.code}) >= 10`),
    check('reward_awards_redeemed_check', sql`(${t.status} = 'redeemed') = (${t.redeemedAt} is not null)`),
  ],
)

export const newsletterOptins = sqliteTable('newsletter_optins', {
  id: id(),
  playerId: text('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  topics: text('topics', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  consentAt: integer('consent_at').notNull(),
  source: text('source'),
})

export const feedback = sqliteTable(
  'feedback',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    playerId: text('player_id').references(() => players.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
  },
  (t) => [check('feedback_rating_check', sql`${t.rating} between 1 and 5`)],
)

export const sessions = sqliteTable(
  'sessions',
  {
    // SHA-256 of the cookie token; the token itself is never stored.
    id: text('id').primaryKey(),
    playerId: text('player_id').references(() => players.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ROLES }).notNull().default('player'),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [check('sessions_role_check', oneOf(t.role, ROLES))],
)
