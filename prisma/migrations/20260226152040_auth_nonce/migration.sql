/*
  Warnings:

  - You are about to drop the column `dates` on the `Artifact` table. All the data in the column will be lost.
  - You are about to drop the column `ipfsCid` on the `Artifact` table. All the data in the column will be lost.
  - You are about to drop the column `people` on the `Artifact` table. All the data in the column will be lost.
  - You are about to drop the column `places` on the `Artifact` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Artifact` table. All the data in the column will be lost.
  - You are about to drop the `ArtifactEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ArtifactEvent" DROP CONSTRAINT "ArtifactEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "ArtifactEvent" DROP CONSTRAINT "ArtifactEvent_artifactId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_artifactId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ExpertReview" DROP CONSTRAINT "ExpertReview_artifactId_fkey";

-- DropForeignKey
ALTER TABLE "ExpertReview" DROP CONSTRAINT "ExpertReview_expertId_fkey";

-- DropForeignKey
ALTER TABLE "Flag" DROP CONSTRAINT "Flag_artifactId_fkey";

-- DropForeignKey
ALTER TABLE "Flag" DROP CONSTRAINT "Flag_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_artifactId_fkey";

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_voterId_fkey";

-- DropIndex
DROP INDEX "Comment_artifactId_createdAt_idx";

-- DropIndex
DROP INDEX "Comment_authorId_createdAt_idx";

-- DropIndex
DROP INDEX "ExpertReview_artifactId_createdAt_idx";

-- DropIndex
DROP INDEX "ExpertReview_expertId_createdAt_idx";

-- DropIndex
DROP INDEX "Flag_artifactId_createdAt_idx";

-- DropIndex
DROP INDEX "Flag_reporterId_createdAt_idx";

-- DropIndex
DROP INDEX "Vote_artifactId_createdAt_idx";

-- DropIndex
DROP INDEX "Vote_voterId_createdAt_idx";

-- AlterTable
ALTER TABLE "Artifact" DROP COLUMN "dates",
DROP COLUMN "ipfsCid",
DROP COLUMN "people",
DROP COLUMN "places",
DROP COLUMN "updatedAt",
ADD COLUMN     "cid" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE "ArtifactEvent";

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
