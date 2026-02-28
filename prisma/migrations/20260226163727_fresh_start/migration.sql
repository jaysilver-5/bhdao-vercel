/*
  Warnings:

  - Added the required column `updatedAt` to the `Artifact` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN     "anchoredAt" TIMESTAMP(3),
ADD COLUMN     "chainBlock" INTEGER,
ADD COLUMN     "chainTxHash" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "language" SET DEFAULT 'en';

-- CreateTable
CREATE TABLE "ArtifactEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "artifactId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "ArtifactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtifactEvent_artifactId_createdAt_idx" ON "ArtifactEvent"("artifactId", "createdAt");

-- CreateIndex
CREATE INDEX "Artifact_status_idx" ON "Artifact"("status");

-- CreateIndex
CREATE INDEX "Artifact_submittedById_idx" ON "Artifact"("submittedById");

-- AddForeignKey
ALTER TABLE "ArtifactEvent" ADD CONSTRAINT "ArtifactEvent_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactEvent" ADD CONSTRAINT "ArtifactEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
