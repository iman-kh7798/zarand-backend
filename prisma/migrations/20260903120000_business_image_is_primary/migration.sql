-- افزودن پرچم «تصویر اصلی/کاور» به تصاویر کسب‌وکار.
-- در هر لحظه فقط یک ردیف از هر businessId باید isPrimary=true باشد؛ این قید
-- در سرویس (BusinessImageService.setPrimary / BusinessService.addImages) رعایت
-- می‌شود نه در سطح دیتابیس. پیش‌فرض false است تا داده‌ی موجود دست‌نخورده بماند.

-- AlterTable
ALTER TABLE `BusinessImage` ADD COLUMN `isPrimary` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `BusinessImage_businessId_isPrimary_idx` ON `BusinessImage`(`businessId`, `isPrimary`);
