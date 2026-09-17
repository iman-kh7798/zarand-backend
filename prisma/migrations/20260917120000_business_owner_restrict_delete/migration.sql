-- DropForeignKey
ALTER TABLE `Business` DROP FOREIGN KEY `Business_ownerId_fkey`;

-- AddForeignKey
-- کاربر صاحب کسب‌وکار دیگر قابل حذف مستقیم نیست (باید ابتدا کسب‌وکار حذف یا مالکیتش منتقل شود)
ALTER TABLE `Business` ADD CONSTRAINT `Business_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
