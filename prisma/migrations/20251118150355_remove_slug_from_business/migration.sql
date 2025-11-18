/*
  Warnings:

  - You are about to drop the column `slug` on the `Business` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Business` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Business_slug_key";

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "slug",
DROP COLUMN "website";
