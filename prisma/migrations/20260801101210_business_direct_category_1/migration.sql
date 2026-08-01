/*
  Warnings:

  - You are about to drop the `BusinessCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `BusinessCategory` DROP FOREIGN KEY `BusinessCategory_businessId_fkey`;

-- DropForeignKey
ALTER TABLE `BusinessCategory` DROP FOREIGN KEY `BusinessCategory_categoryId_fkey`;

-- DropTable
DROP TABLE `BusinessCategory`;
