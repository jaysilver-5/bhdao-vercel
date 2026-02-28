/*
  Warnings:

  - You are about to drop the column `cid` on the `Artifact` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Artifact` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ArtifactStatus" ADD VALUE 'WITHDRAWN';

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

-- AlterTable
ALTER TABLE "Artifact" DROP COLUMN "cid",
ADD COLUMN     "dates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ipfsCid" TEXT,
ADD COLUMN     "people" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "places" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'COMMUNITY_REVIEW';

-- CreateTable
CREATE TABLE "ArtifactEvent" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtifactEvent_artifactId_createdAt_idx" ON "ArtifactEvent"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtifactEvent_actorId_createdAt_idx" ON "ArtifactEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_artifactId_createdAt_idx" ON "Comment"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ExpertReview_artifactId_createdAt_idx" ON "ExpertReview"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "ExpertReview_expertId_createdAt_idx" ON "ExpertReview"("expertId", "createdAt");

-- CreateIndex
CREATE INDEX "Flag_artifactId_createdAt_idx" ON "Flag"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "Flag_reporterId_createdAt_idx" ON "Flag"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "Vote_artifactId_createdAt_idx" ON "Vote"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "Vote_voterId_createdAt_idx" ON "Vote"("voterId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArtifactEvent" ADD CONSTRAINT "ArtifactEvent_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactEvent" ADD CONSTRAINT "ArtifactEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
