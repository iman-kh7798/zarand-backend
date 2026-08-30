-- AlterTable
ALTER TABLE `BusinessImage` ADD COLUMN `isPrimary` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `BusinessImage_businessId_isPrimary_idx` ON `BusinessImage`(`businessId`, `isPrimary`);

-- بک‌فیل: برای هر کسب‌وکار قدیمی‌ترین تصویر گالری به‌عنوان تصویر اصلی علامت می‌خورد.
-- (رَپِ derived-table برای دور زدن محدودیت «can't specify target table for update» در MySQL/MariaDB است.)
UPDATE `BusinessImage` bi
SET bi.`isPrimary` = true
WHERE bi.`id` = (
  SELECT x.`id` FROM (
    SELECT `id`
    FROM `BusinessImage`
    WHERE `businessId` = bi.`businessId`
    ORDER BY `position` ASC, `createdAt` ASC, `id` ASC
    LIMIT 1
  ) x
);
