/*
  Warnings:

  - You are about to drop the column `filename` on the `Artifact` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artifact" DROP COLUMN "filename",
ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "fileUrl" TEXT;
