/**
 * Database seed.
 *
 * Seeds past papers + their questions from the ingestion snapshot
 * (packages/papers/ingested.json) — a zero-AI-cost bulk upsert, so a fresh
 * deploy never has to re-run the Anthropic batch.
 *
 * This seed is NON-DESTRUCTIVE: it upserts and never deletes, so it is safe
 * to run against a database that already holds real ingested data.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import prisma from "../src/index";

const SNAPSHOT = join(import.meta.dir, "../../papers/ingested.json");

interface SnapshotQuestion {
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
  officialGuide: string | null;
  guideSource: "AI_GENERATED" | "OFFICIAL";
}

interface SnapshotPaper {
  paperCode: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
  fileUrl: string;
  filePath: string | null;
  pageCount: number | null;
  questionCount: number;
  questions: SnapshotQuestion[];
}

async function main() {
  if (!existsSync(SNAPSHOT)) {
    console.log("No ingested.json snapshot found — nothing to seed.");
    console.log("Run the ingestion pipeline in packages/papers to generate it:");
    console.log("  bun run ingest:extract && bun run ingest:submit && bun run ingest:collect");
    return;
  }

  const papers = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as SnapshotPaper[];
  console.log(`Seeding ${papers.length} past papers from ingested.json…`);

  let questionCount = 0;
  for (const p of papers) {
    const resource = await prisma.resource.upsert({
      where: { paperCode: p.paperCode },
      create: {
        paperCode: p.paperCode,
        title: p.title,
        subject: p.subject,
        grade: p.grade,
        year: p.year,
        type: "PAST_PAPER",
        fileUrl: p.fileUrl,
        filePath: p.filePath,
        pageCount: p.pageCount,
        questionCount: p.questionCount,
        ingestStatus: "INGESTED",
        ingestedAt: new Date(),
      },
      update: {
        title: p.title,
        subject: p.subject,
        fileUrl: p.fileUrl,
        questionCount: p.questionCount,
        ingestStatus: "INGESTED",
      },
    });

    for (const q of p.questions) {
      await prisma.paperQuestion.upsert({
        where: {
          resourceId_questionNumber: {
            resourceId: resource.id,
            questionNumber: q.questionNumber,
          },
        },
        create: {
          resourceId: resource.id,
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
          officialGuide: q.officialGuide,
          guideSource: q.guideSource,
        },
        update: {
          text: q.text,
          marks: q.marks,
          aiModelAnswer: q.aiModelAnswer,
          officialGuide: q.officialGuide,
          guideSource: q.guideSource,
        },
      });
      questionCount++;
    }
  }

  console.log(`Seeded ${papers.length} papers, ${questionCount} questions.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
