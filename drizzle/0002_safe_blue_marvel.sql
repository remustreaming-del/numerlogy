ALTER TABLE `orders` ADD `product` text DEFAULT 'etsgiin-kod' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `birth_time` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `birth_city` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `birth_timezone` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `birth_latitude` real;--> statement-breakpoint
ALTER TABLE `orders` ADD `birth_longitude` real;--> statement-breakpoint
ALTER TABLE `orders` ADD `unknown_time` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `chart_json` text;