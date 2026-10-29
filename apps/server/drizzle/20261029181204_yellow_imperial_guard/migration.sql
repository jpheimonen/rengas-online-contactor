CREATE TABLE `provider_keys` (
	`sessionId` text NOT NULL,
	`provider` text NOT NULL,
	`ciphertext` text NOT NULL,
	`hint` text NOT NULL,
	`validatedAt` text NOT NULL,
	CONSTRAINT `provider_keys_pk` PRIMARY KEY(`sessionId`, `provider`),
	CONSTRAINT `fk_provider_keys_sessionId_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE
);
