CREATE TABLE `catalogs` (
	`id` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fx_cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`fetched_at` integer NOT NULL
);
