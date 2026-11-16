-- drizzle-kit generates a table rebuild for this change. The rebuild's DROP TABLE would cascade-delete
-- every event_questions row (and with it submissions and score_events), because the migrator runs in a
-- transaction where turning foreign keys off has no effect. So this migration adds the columns in place.
ALTER TABLE `rounds` ADD `host_choice` text DEFAULT 'random' NOT NULL CONSTRAINT "rounds_host_choice_check" CHECK(`host_choice` in ('random', 'rocco', 'pebble', 'june'));--> statement-breakpoint
ALTER TABLE `rounds` ADD `host` text CONSTRAINT "rounds_host_check" CHECK(`host` in ('rocco', 'pebble', 'june'));
