CREATE TABLE `run_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`sessionId` text NOT NULL,
	`runId` text,
	`type` text NOT NULL,
	`body` text NOT NULL,
	`createdAt` text NOT NULL,
	CONSTRAINT `fk_run_events_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_run_events_runId_runs_id_fk` FOREIGN KEY (`runId`) REFERENCES `runs`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY,
	`sessionId` text NOT NULL,
	`actionId` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`startedAt` text NOT NULL,
	`endedAt` text,
	CONSTRAINT `fk_runs_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY,
	`ticketNumber` text NOT NULL,
	`complaint` text NOT NULL,
	`customer` text NOT NULL,
	`createdAt` text NOT NULL,
	`lastSeenAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unlocks` (
	`sessionId` text NOT NULL,
	`rungId` text NOT NULL,
	`mode` text NOT NULL,
	`createdAt` text NOT NULL,
	CONSTRAINT `unlocks_pk` PRIMARY KEY(`sessionId`, `rungId`),
	CONSTRAINT `fk_unlocks_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `run_events_session_idx` ON `run_events` (`sessionId`,`id`);--> statement-breakpoint
CREATE INDEX `runs_session_idx` ON `runs` (`sessionId`);