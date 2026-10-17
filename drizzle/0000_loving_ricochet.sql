CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`access_hash` text NOT NULL,
	`callback_hash` text NOT NULL,
	`name` text NOT NULL,
	`birthday` text NOT NULL,
	`language` text NOT NULL,
	`amount` integer NOT NULL,
	`year` integer NOT NULL,
	`status` text DEFAULT 'creating' NOT NULL,
	`invoice_id` text,
	`invoice_json` text,
	`created_at` integer NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE TABLE `service_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL
);
