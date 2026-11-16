-- drizzle-kit generates a table rebuild for this change. The rebuild's DROP TABLE would cascade-delete
-- animal_updates and animal_follows (and fail on naming_prizes), so this migration adds the column in place instead.
ALTER TABLE `animals` ADD `avatar` text DEFAULT 'mystery' NOT NULL CONSTRAINT "animals_avatar_check" CHECK(`avatar` in ('giant-pacific-octopus', 'moray-eel', 'mystery', 'pacific-seahorse', 'penguin-chick'));
