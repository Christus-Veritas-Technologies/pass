/**
 * Seed the database from ingested.json.
 *
 * Run this on a fresh VPS after uploading ingested.json:
 *
 *   bun --env-file=../../apps/server/.env scripts/seed.ts
 *
 * or via the package script:
 *
 *   bun run seed
 *
 * The script is fully idempotent — safe to re-run at any time.
 * It upserts Resources and replaces their PaperQuestions in one pass.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import prisma from "@pass/db";

const SNAPSHOT_FILE = join(import.meta.dir, "../ingested.json");

interface SnapshotQuestion {
  id: string;
  resourceId: string;
  questionNumber: number;
  text: string;
  marks: number;
  subParts: unknown;
  section: string | null;
  topic: string | null;
  pdfPage: number | null;
  hasDiagram: boolean;
  diagramNote: string | null;
  aiModelAnswer: string;
  officialMarkingGuide: string | null;
  guideSource: string;
  createdAt: string;
  updatedAt: string;
}

interface SnapshotResource {
  id: string;
  paperCode: string | null;
  title: string;
  subject: string | null;
  grade: string | null;
  year: number | null;
  type: string;
  fileUrl: string | null;
  filePath: string | null;
  ingestStatus: string;
  questionCount: number | null;
  pageCount: number | null;
  ingestedAt: string | null;
  ingestError: string | null;
  createdAt: string;
  updatedAt: string;
  questions: SnapshotQuestion[];
}

async function seed() {
  if (!existsSync(SNAPSHOT_FILE)) {
    console.error(`❌  ingested.json not found at ${SNAPSHOT_FILE}`);
    console.error("    Upload it from your local machine first:");
    console.error("    scp packages/papers/ingested.json user@vps:/path/to/pass/packages/papers/ingested.json");
    process.exit(1);
  }

  const raw = readFileSync(SNAPSHOT_FILE, "utf8");
  const resources: SnapshotResource[] = JSON.parse(raw);

  console.log(`Seeding ${resources.length} papers from ingested.json…\n`);

  let created = 0;
  let updated = 0;
  let questionCount = 0;
  let failed = 0;

  for (const r of resources) {
    try {
      // Upsert the Resource row (keyed on paperCode if present, otherwise id).
      const whereClause = r.paperCode
        ? { paperCode: r.paperCode }
        : { id: r.id };

      await prisma.resource.upsert({
        where: whereClause,
        create: {
          id: r.id,
          paperCode: r.paperCode,
          title: r.title,
          subject: r.subject,
          grade: r.grade,
          year: r.year,
          type: r.type as "PAST_PAPER",
          fileUrl: r.fileUrl,
          filePath: r.filePath,
          ingestStatus: "INGESTED",
          questionCount: r.questionCount,
          pageCount: r.pageCount,
          ingestedAt: r.ingestedAt ? new Date(r.ingestedAt) : new Date(),
        },
        update: {
          title: r.title,
          subject: r.subject,
          grade: r.grade,
          year: r.year,
          fileUrl: r.fileUrl,
          filePath: r.filePath,
          ingestStatus: "INGESTED",
          questionCount: r.questionCount,
          pageCount: r.pageCount,
          ingestedAt: r.ingestedAt ? new Date(r.ingestedAt) : new Date(),
        },
      });

      const resourceId = r.id;

      // Replace all questions for this paper.
      await prisma.paperQuestion.deleteMany({ where: { resourceId } });

      for (const q of r.questions) {
        await prisma.paperQuestion.create({
          data: {
            resourceId,
            questionNumber: q.questionNumber,
            text: q.text,
            marks: q.marks,
            subParts: q.subParts ?? undefined,
            section: q.section,
            topic: q.topic,
            pdfPage: q.pdfPage,
            hasDiagram: q.hasDiagram,
            diagramNote: q.diagramNote,
            aiModelAnswer: q.aiModelAnswer,
            officialMarkingGuide: q.officialMarkingGuide,
            guideSource: q.guideSource as "AI_GENERATED" | "OFFICIAL",
          },
        });
        questionCount++;
      }

      const isNew = (new Date(r.createdAt).getTime() > Date.now() - 5000);
      isNew ? created++ : updated++;
      console.log(`  ✓ ${r.paperCode ?? r.id}  (${r.questions.length} questions)`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ ${r.paperCode ?? r.id}  — ${(err as Error).message}`);
    }
  }

  console.log(
    `\nDone. ${created} created, ${updated} updated, ${failed} failed.` +
    `\nTotal questions seeded: ${questionCount}`,
  );
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
