-- AlterTable: add downloadsUsed column to MonthlyUsage for per-plan download quota tracking
ALTER TABLE "MonthlyUsage" ADD COLUMN "downloadsUsed" INTEGER NOT NULL DEFAULT 0;
