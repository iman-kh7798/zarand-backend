-- DropForeignKey
ALTER TABLE `BusinessReview` DROP FOREIGN KEY `BusinessReview_businessId_fkey`;

-- DropIndex
DROP INDEX `BusinessReview_businessId_userId_key` ON `BusinessReview`;

-- AlterTable
ALTER TABLE `BusinessReview` ADD COLUMN `parentId` CHAR(36) NULL,
    MODIFY `rating` INTEGER NULL;

-- CreateIndex
CREATE INDEX `BusinessReview_parentId_idx` ON `BusinessReview`(`parentId`);

-- CreateIndex
CREATE INDEX `BusinessReview_businessId_parentId_isApproved_idx` ON `BusinessReview`(`businessId`, `parentId`, `isApproved`);

-- AddForeignKey
ALTER TABLE `BusinessReview` ADD CONSTRAINT `BusinessReview_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessReview` ADD CONSTRAINT `BusinessReview_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `BusinessReview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

