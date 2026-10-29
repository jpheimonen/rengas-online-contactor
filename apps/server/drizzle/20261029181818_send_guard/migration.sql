CREATE TABLE `recipients` (
	`id` text PRIMARY KEY,
	`sessionId` text NOT NULL,
	`channel` text NOT NULL,
	`address` text NOT NULL,
	`createdAt` text NOT NULL,
	`verifiedAt` text,
	CONSTRAINT `fk_recipients_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `send_confirmations` (
	`tokenHash` text PRIMARY KEY,
	`sessionId` text NOT NULL,
	`actionId` text NOT NULL,
	`recipientId` text NOT NULL,
	`content` text NOT NULL,
	`expiresAt` text NOT NULL,
	`usedAt` text,
	CONSTRAINT `fk_send_confirmations_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_send_confirmations_recipientId_recipients_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `recipients`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `sends` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`sessionId` text NOT NULL,
	`runId` text NOT NULL,
	`channel` text NOT NULL,
	`recipientAddress` text NOT NULL,
	`status` text NOT NULL,
	`providerMessageId` text,
	`createdAt` text NOT NULL,
	CONSTRAINT `fk_sends_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_sends_runId_runs_id_fk` FOREIGN KEY (`runId`) REFERENCES `runs`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`sessionId` text NOT NULL,
	`recipientId` text NOT NULL,
	`codeHash` text,
	`expiresAt` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`sentAt` text NOT NULL,
	`closedAt` text,
	CONSTRAINT `fk_verification_codes_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_verification_codes_recipientId_recipients_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `recipients`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipients_address_idx` ON `recipients` (`sessionId`,`address`);--> statement-breakpoint
CREATE INDEX `sends_session_idx` ON `sends` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `verification_codes_session_idx` ON `verification_codes` (`sessionId`);