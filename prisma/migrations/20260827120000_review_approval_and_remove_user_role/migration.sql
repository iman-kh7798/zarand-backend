-- AlterTable
ALTER TABLE `BusinessReview` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `isApproved` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `BusinessReview_businessId_isApproved_idx` ON `BusinessReview`(`businessId`, `isApproved`);

-- CreateIndex
CREATE INDEX `BusinessReview_isApproved_createdAt_idx` ON `BusinessReview`(`isApproved`, `createdAt`);

-- نظرات موجود قبلاً برای همه نمایش داده می‌شدند، پس تایید‌شده در نظر گرفته می‌شوند.
-- اگر می‌خواهید همه‌ی نظرات قبلی هم دوباره بازبینی شوند، این دو دستور را حذف کنید.
UPDATE `BusinessReview` SET `isApproved` = true;
UPDATE `BusinessReview` SET `approvedAt` = `createdAt` WHERE `isApproved` = true;

-- حذف نقش USER: کاربران فعلی این نقش به OWNER منتقل می‌شوند.
UPDATE `User` SET `roleId` = (SELECT `id` FROM `Role` WHERE `name` = 'OWNER')
  WHERE `roleId` IN (SELECT `id` FROM (SELECT `id` FROM `Role` WHERE `name` = 'USER') AS r);

DELETE FROM `Role` WHERE `name` = 'USER';
