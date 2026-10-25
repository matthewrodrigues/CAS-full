CREATE TABLE `badges` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badges_slug_unique` ON `badges` (`slug`);--> statement-breakpoint
CREATE TABLE `event_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`round_id` text NOT NULL,
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`duration_s` integer NOT NULL,
	`points` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "event_questions_duration_s_check" CHECK("event_questions"."duration_s" > 0),
	CONSTRAINT "event_questions_points_check" CHECK("event_questions"."points" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_questions_round_position_unique` ON `event_questions` (`round_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_questions_event_question_unique` ON `event_questions` (`event_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`season_id` text NOT NULL,
	`theme_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`join_code` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`settings` text NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "events_status_check" CHECK("events"."status" in ('draft', 'ready', 'live', 'ended')),
	CONSTRAINT "events_join_code_check" CHECK(length("events"."join_code") between 4 and 5 and "events"."join_code" not glob '*[^A-Z0-9]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_join_code_unique` ON `events` (`join_code`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`player_id` text,
	`rating` integer NOT NULL,
	`comment` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "feedback_rating_check" CHECK("feedback"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE `game_state` (
	`event_id` text PRIMARY KEY NOT NULL,
	`phase` text DEFAULT 'lobby' NOT NULL,
	`current_event_question_id` text,
	`opens_at` integer,
	`closes_at` integer,
	`paused_at` integer,
	`paused_from_phase` text,
	`live_payload` text,
	`reveal_payload` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_event_question_id`) REFERENCES `event_questions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "game_state_phase_check" CHECK("game_state"."phase" in ('lobby', 'live', 'locked', 'revealed', 'round_break', 'final_wager', 'final_live', 'final_locked', 'final_revealed', 'ended', 'paused')),
	CONSTRAINT "game_state_paused_from_phase_check" CHECK("game_state"."paused_from_phase" in ('lobby', 'live', 'locked', 'revealed', 'round_break', 'final_wager', 'final_live', 'final_locked', 'final_revealed', 'ended'))
);
--> statement-breakpoint
CREATE TABLE `newsletter_optins` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`email` text NOT NULL,
	`topics` text NOT NULL,
	`consent_at` integer NOT NULL,
	`source` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `player_badges` (
	`badge_id` text NOT NULL,
	`player_id` text NOT NULL,
	`earned_at` integer NOT NULL,
	PRIMARY KEY(`badge_id`, `player_id`),
	FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`display_mode` text DEFAULT 'nickname' NOT NULL,
	`extra_time_s` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "players_display_mode_check" CHECK("players"."display_mode" in ('nickname', 'first_name', 'initials')),
	CONSTRAINT "players_extra_time_s_check" CHECK("players"."extra_time_s" >= 0)
);
--> statement-breakpoint
CREATE TABLE `question_answers` (
	`question_id` text PRIMARY KEY NOT NULL,
	`accepted_answers` text NOT NULL,
	`correct_option` integer,
	`numeric_answer` real,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`type` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text,
	`media_kind` text DEFAULT 'none' NOT NULL,
	`media_url` text,
	`caption` text,
	`fun_fact` text,
	`difficulty` integer,
	`author` text,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "questions_type_check" CHECK("questions"."type" in ('mc', 'typed', 'true_false', 'closest_number')),
	CONSTRAINT "questions_media_kind_check" CHECK("questions"."media_kind" in ('none', 'image', 'audio')),
	CONSTRAINT "questions_media_url_check" CHECK(("questions"."media_kind" = 'none') = ("questions"."media_url" is null)),
	CONSTRAINT "questions_difficulty_check" CHECK("questions"."difficulty" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE `reward_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`reward_id` text NOT NULL,
	`player_id` text,
	`code` text NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`issued_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`redeemed_by` text,
	`redeemed_at` integer,
	FOREIGN KEY (`reward_id`) REFERENCES `rewards`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "reward_awards_status_check" CHECK("reward_awards"."status" in ('issued', 'redeemed', 'expired')),
	CONSTRAINT "reward_awards_code_check" CHECK(length("reward_awards"."code") >= 10),
	CONSTRAINT "reward_awards_redeemed_check" CHECK(("reward_awards"."status" = 'redeemed') = ("reward_awards"."redeemed_at" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_awards_code_unique` ON `reward_awards` (`code`);--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tier` integer NOT NULL,
	`description` text,
	`expires_after_days` integer NOT NULL,
	`per_person_limit` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rewards_tier_check" CHECK("rewards"."tier" >= 1),
	CONSTRAINT "rewards_expires_after_days_check" CHECK("rewards"."expires_after_days" > 0),
	CONSTRAINT "rewards_per_person_limit_check" CHECK("rewards"."per_person_limit" >= 1)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "rounds_format_check" CHECK("rounds"."format" in ('standard', 'picture', 'sound', 'wager'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_one_wager_per_event` ON `rounds` (`event_id`) WHERE "rounds"."format" = 'wager';--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_event_position_unique` ON `rounds` (`event_id`,`position`);--> statement-breakpoint
CREATE TABLE `score_events` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`event_question_id` text,
	`points` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_question_id`) REFERENCES `event_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "score_events_reason_check" CHECK("score_events"."reason" in ('correct', 'speed', 'wager', 'adjust')),
	CONSTRAINT "score_events_adjust_note_check" CHECK("score_events"."reason" <> 'adjust' or coalesce(length(trim("score_events"."note")), 0) > 0)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text,
	`role` text DEFAULT 'player' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sessions_role_check" CHECK("sessions"."role" in ('player', 'host', 'staff'))
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_question_id` text NOT NULL,
	`team_id` text NOT NULL,
	`answer` text,
	`updated_by` text,
	`received_at` integer NOT NULL,
	`is_draft` integer DEFAULT false NOT NULL,
	`auto_result` text,
	`override_result` text,
	`wager` integer,
	`distance` real,
	FOREIGN KEY (`event_question_id`) REFERENCES `event_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "submissions_is_draft_check" CHECK("submissions"."is_draft" in (0, 1)),
	CONSTRAINT "submissions_auto_result_check" CHECK("submissions"."auto_result" in ('correct', 'incorrect', 'review')),
	CONSTRAINT "submissions_override_result_check" CHECK("submissions"."override_result" in ('correct', 'incorrect')),
	CONSTRAINT "submissions_wager_check" CHECK("submissions"."wager" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_question_team_unique` ON `submissions` (`event_question_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` text NOT NULL,
	`event_id` text NOT NULL,
	`player_id` text NOT NULL,
	PRIMARY KEY(`team_id`, `player_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`,`event_id`) REFERENCES `teams`(`id`,`event_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_event_player_unique` ON `team_members` (`event_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`captain_id` text,
	`name_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`captain_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "teams_name_status_check" CHECK("teams"."name_status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_event_name_unique` ON `teams` (`event_id`,lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX `teams_id_event_unique` ON `teams` (`id`,`event_id`);--> statement-breakpoint
CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`badge_image_url` text,
	`accent_token` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `themes_slug_unique` ON `themes` (`slug`);