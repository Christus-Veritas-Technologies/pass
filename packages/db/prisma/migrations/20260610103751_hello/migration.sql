-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPoolCursor" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "nextIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectPoolCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTemplate_grade_subject_idx" ON "ProjectTemplate"("grade", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_grade_subject_slot_key" ON "ProjectTemplate"("grade", "subject", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPoolCursor_grade_subject_key" ON "ProjectPoolCursor"("grade", "subject");

-- CreateIndex
CREATE INDEX "PaperSession_userId_idx" ON "PaperSession"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");
