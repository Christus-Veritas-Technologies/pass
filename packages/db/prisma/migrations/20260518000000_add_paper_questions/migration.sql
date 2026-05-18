-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('PENDING', 'TEXT_EXTRACTED', 'NEEDS_VISION', 'INGESTED', 'FAILED');

-- CreateEnum
CREATE TYPE "GuideSource" AS ENUM ('AI_GENERATED', 'OFFICIAL');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "ingestError" TEXT,
ADD COLUMN     "ingestStatus" "IngestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "ingestedAt" TIMESTAMP(3),
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "paperCode" TEXT,
ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PaperQuestion" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 0,
    "subParts" JSONB,
    "section" TEXT,
    "topic" TEXT,
    "pdfPage" INTEGER,
    "hasDiagram" BOOLEAN NOT NULL DEFAULT false,
    "diagramNote" TEXT,
    "aiModelAnswer" TEXT NOT NULL,
    "officialGuide" TEXT,
    "guideSource" "GuideSource" NOT NULL DEFAULT 'AI_GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperQuestion_resourceId_idx" ON "PaperQuestion"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperQuestion_resourceId_questionNumber_key" ON "PaperQuestion"("resourceId", "questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_paperCode_key" ON "Resource"("paperCode");

-- AddForeignKey
ALTER TABLE "PaperQuestion" ADD CONSTRAINT "PaperQuestion_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
