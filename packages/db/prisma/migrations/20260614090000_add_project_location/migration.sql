-- AlterTable: add district + province to Project for the candidate-info cover page
ALTER TABLE "Project" ADD COLUMN "district" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "province" TEXT NOT NULL DEFAULT '';
