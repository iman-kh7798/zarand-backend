-- تبدیل فیلد بولی isApproved نظرات کسب‌وکار به وضعیت سه‌حالته status
-- (PENDING / APPROVED / REJECTED) بدون از دست رفتن دیتای موجود.

-- DropForeignKey
ALTER TABLE `BusinessReview` DROP FOREIGN KEY `BusinessReview_businessId_fkey`;

-- DropIndex
DROP INDEX `BusinessReview_businessId_isApproved_idx` ON `BusinessReview`;

-- DropIndex
DROP INDEX `BusinessReview_businessId_parentId_isApproved_idx` ON `BusinessReview`;

-- DropIndex
DROP INDEX `BusinessReview_isApproved_createdAt_idx` ON `BusinessReview`;

-- AlterTable: ابتدا ستون جدید اضافه می‌شود
ALTER TABLE `BusinessReview` ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- Backfill: نظرهایی که قبلاً تایید شده بودند به APPROVED منتقل می‌شوند
-- (بقیه در حالت PENDING می‌مانند؛ چون حالت REJECTED قبلاً وجود نداشت)
UPDATE `BusinessReview` SET `status` = 'APPROVED' WHERE `isApproved` = true;

-- حالا ستون قدیمی حذف می‌شود
ALTER TABLE `BusinessReview` DROP COLUMN `isApproved`;

-- CreateIndex
CREATE INDEX `BusinessReview_businessId_status_idx` ON `BusinessReview`(`businessId`, `status`);

-- CreateIndex
CREATE INDEX `BusinessReview_businessId_parentId_status_idx` ON `BusinessReview`(`businessId`, `parentId`, `status`);

-- CreateIndex
CREATE INDEX `BusinessReview_status_createdAt_idx` ON `BusinessReview`(`status`, `createdAt`);

-- AddForeignKey
ALTER TABLE `BusinessReview` ADD CONSTRAINT `BusinessReview_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
