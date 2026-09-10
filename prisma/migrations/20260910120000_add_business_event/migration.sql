-- CreateTable
CREATE TABLE `BusinessEvent` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `type` ENUM('PROFILE_VIEW', 'PHONE_CLICK', 'SOCIAL_CLICK') NOT NULL,
    `meta` JSON NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BusinessEvent_businessId_visitorId_type_createdAt_idx`(`businessId`, `visitorId`, `type`, `createdAt`),
    INDEX `BusinessEvent_businessId_type_createdAt_idx`(`businessId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BusinessEvent` ADD CONSTRAINT `BusinessEvent_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
