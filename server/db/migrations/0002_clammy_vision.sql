CREATE TABLE `animal_follows` (
	`player_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`followed_at` integer NOT NULL,
	PRIMARY KEY(`player_id`, `animal_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `animal_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`animal_id` text NOT NULL,
	`body` text NOT NULL,
	`posted_at` integer NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "animal_updates_body_check" CHECK(length(trim("animal_updates"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE `animals` (
	`id` text PRIMARY KEY NOT NULL,
	`species` text NOT NULL,
	`scientific_name` text,
	`exhibit` text NOT NULL,
	`about` text,
	`image_url` text,
	`name` text,
	`named_at` integer,
	`named_event_id` text,
	`named_by_team` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`named_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "animals_named_check" CHECK(("animals"."name" is null) = ("animals"."named_at" is null))
);
--> statement-breakpoint
CREATE TABLE `naming_prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`place` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "naming_prizes_place_check" CHECK("naming_prizes"."place" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `naming_prizes_event_place_unique` ON `naming_prizes` (`event_id`,`place`);--> statement-breakpoint
CREATE UNIQUE INDEX `naming_prizes_animal_unique` ON `naming_prizes` (`animal_id`);--> statement-breakpoint
CREATE TABLE `naming_rights` (
	`id` text PRIMARY KEY NOT NULL,
	`prize_id` text NOT NULL,
	`team_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`proposed_name` text,
	`proposed_by` text,
	`proposed_at` integer,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prize_id`) REFERENCES `naming_prizes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`proposed_by`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "naming_rights_status_check" CHECK("naming_rights"."status" in ('open', 'pending', 'approved', 'rejected')),
	CONSTRAINT "naming_rights_proposed_check" CHECK("naming_rights"."status" = 'open' or "naming_rights"."proposed_name" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `naming_rights_prize_team_unique` ON `naming_rights` (`prize_id`,`team_id`);