-- AlterTable
ALTER TABLE `Business` ADD COLUMN `statusReason` TEXT NULL;

-- CreateTable
CREATE TABLE `Notification` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('BUSINESS_CREATED', 'BUSINESS_APPROVED', 'BUSINESS_REJECTED', 'REVIEW_CREATED', 'BUSINESS_REPORT_CREATED', 'USER_WELCOME', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `audience` ENUM('USERS', 'ADMINS', 'ALL_USERS', 'BUSINESS_OWNER', 'BUSINESS_FAVORITES') NOT NULL,
    `status` ENUM('PENDING_APPROVAL', 'REJECTED', 'QUEUED', 'SENT', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `sendSms` BOOLEAN NOT NULL DEFAULT false,
    `smsText` TEXT NULL,
    `data` JSON NULL,
    `businessId` CHAR(36) NULL,
    `createdById` CHAR(36) NULL,
    `approvedById` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `recipientsCount` INTEGER NOT NULL DEFAULT 0,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Notification_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `Notification_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `Notification_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationRecipient` (
    `id` CHAR(36) NOT NULL,
    `notificationId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `smsStatus` ENUM('NONE', 'PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'NONE',
    `smsAttempts` INTEGER NOT NULL DEFAULT 0,
    `smsError` TEXT NULL,
    `smsSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotificationRecipient_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
    INDEX `NotificationRecipient_smsStatus_smsAttempts_createdAt_idx`(`smsStatus`, `smsAttempts`, `createdAt`),
    UNIQUE INDEX `NotificationRecipient_notificationId_userId_key`(`notificationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationRecipient` ADD CONSTRAINT `NotificationRecipient_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationRecipient` ADD CONSTRAINT `NotificationRecipient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

