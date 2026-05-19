/**
 * ZIMSEC paper ingestion pipeline.
 *
 *   bun run ingest:extract   — register papers + free local text extraction
 *   bun run ingest:submit    — submit an Anthropic Batch to structure questions
 *   bun run ingest:collect   — collect batch results → PaperQuestion rows + snapshot
 *   bun run ingest:status    — print ingestion progress
 *
 * The expensive AI step runs ONCE, offline. Every student session then reuses
 * the stored questions + marking rubrics at zero marginal AI cost.
 */

import Anthropic from "@anthropic-ai/sdk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import prisma from "@pass/db";
import { CACHE_DIR, PAPERS_ROOT, cacheKey, listPaperFiles } from "./paper-files";

// ─── Config ──────────────────────────────────────────────────────────────────

const STRUCTURING_MODEL = "claude-sonnet-4-6";
const MIN_CHARS_PER_PAGE = 80; // below this → treat as an image scan (NEEDS_VISION)
const BATCH_FILE = join(CACHE_DIR, "batch.json");
const SNAPSHOT_FILE = join(import.meta.dir, "../ingested.json");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}
const textCachePath = (paperCode: string) => join(CACHE_DIR, `${cacheKey(paperCode)}.txt`);

/** Generate a short unique custom_id for batch requests (≤64 chars). */
function shortCustomId(paperCode: string): string {
  const hash = createHash("sha256").update(paperCode).digest("hex").slice(0, 16);
  return `paper-${hash}`;
}

// ─── AI structuring contract ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You extract questions from ZIMSEC (Zimbabwe) exam past papers to power a study app.

Given a paper's text or PDF, produce a structured list of EVERY question a student must answer. For each question provide:
- questionNumber: the question's number as printed (1, 2, 3 …).
- section: the exam section it belongs to ("Section A", "Section B", …) or omit if none.
- text: the COMPLETE question text, verbatim, including any data/quotes/passages needed to answer it.
- marks: total marks for the question.
- subParts: if the question has labelled parts, an array of { label: "(a)", text, marks }. Omit if none.
- topic: the syllabus topic the question tests (short phrase).
- pdfPage: the 1-based page number the question appears on.
- hasDiagram: true if answering REQUIRES a diagram, map, graph, circuit, table or figure that cannot be conveyed in plain text.
- diagramNote: when hasDiagram is true, a short description of the figure the student must refer to.
- aiModelAnswer: a concise model answer / marking rubric — the key points an examiner awards marks for. This MUST always be filled; it is the fallback marking guide when no official scheme exists. For calculation questions, give the worked method and final answer. For essays, give the expected arguments/points.

Be accurate, thorough, and faithful to the source. Submit results via the submit_questions tool.`;

const QUESTION_TOOL: Anthropic.Tool = {
  name: "submit_questions",
  description: "Submit the structured list of questions extracted from the exam paper.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionNumber: { type: "integer" },
            section: { type: "string" },
            text: { type: "string" },
            marks: { type: "integer" },
            subParts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  text: { type: "string" },
                  marks: { type: "integer" },
                },
                required: ["label", "text"],
              },
            },
            topic: { type: "string" },
            pdfPage: { type: "integer" },
            hasDiagram: { type: "boolean" },
            diagramNote: { type: "string" },
            aiModelAnswer: { type: "string" },
          },
          required: ["questionNumber", "text", "marks", "hasDiagram", "aiModelAnswer"],
        },
      },
    },
    required: ["questions"],
  },
};

interface ExtractedQuestion {
  questionNumber: number;
  section?: string;
  text: string;
  marks: number;
  subParts?: { label: string; text: string; marks?: number }[];
  topic?: string;
  pdfPage?: number;
  hasDiagram: boolean;
  diagramNote?: string;
  aiModelAnswer: string;
}

// ─── extract: register papers + free local text extraction ─────────────────────

async function cmdExtract() {
  ensureCacheDir();
  const files = await listPaperFiles();
  console.log(`Found ${files.length} question-paper PDFs.\n`);

  // 1. Register every paper as a Resource (idempotent — keyed on paperCode).
  let created = 0;
  for (const f of files) {
    const res = await prisma.resource.upsert({
      where: { paperCode: f.paperCode },
      create: {
        paperCode: f.paperCode,
        title: f.title,
        subject: f.subject,
        grade: f.grade,
        year: f.year,
        type: "PAST_PAPER",
        fileUrl: f.fileUrl,
        filePath: f.filePath,
        ingestStatus: "PENDING",
      },
      // Refresh metadata only — never clobber ingestion progress.
      update: { title: f.title, subject: f.subject, fileUrl: f.fileUrl, filePath: f.filePath },
    });
    if (res.createdAt.getTime() > Date.now() - 5000) created++;
  }
  console.log(`Registered ${files.length} resources (${created} new).\n`);

  // 2. Local text extraction for everything still PENDING.
  const pending = await prisma.resource.findMany({
    where: { type: "PAST_PAPER", ingestStatus: "PENDING", paperCode: { not: null } },
  });
  console.log(`Extracting text from ${pending.length} papers…\n`);

  let textOk = 0;
  let needsVision = 0;
  for (const r of pending) {
    const file = files.find((f) => f.paperCode === r.paperCode);
    if (!file) continue;
    try {
      const buf = await Bun.file(file.absPath).arrayBuffer();
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { totalPages, text } = await extractText(pdf, { mergePages: true });
      const density = text.length / Math.max(totalPages, 1);

      if (density < MIN_CHARS_PER_PAGE) {
        await prisma.resource.update({
          where: { id: r.id },
          data: { ingestStatus: "NEEDS_VISION", pageCount: totalPages },
        });
        needsVision++;
        console.log(`  ◐ NEEDS_VISION  ${r.paperCode}  (${Math.round(density)} chars/pg)`);
      } else {
        writeFileSync(textCachePath(r.paperCode!), text, "utf8");
        await prisma.resource.update({
          where: { id: r.id },
          data: { ingestStatus: "TEXT_EXTRACTED", pageCount: totalPages },
        });
        textOk++;
        console.log(`  ✓ TEXT          ${r.paperCode}  (${totalPages}pg)`);
      }
    } catch (e) {
      await prisma.resource.update({
        where: { id: r.id },
        data: { ingestStatus: "FAILED", ingestError: `extract: ${(e as Error).message}` },
      });
      console.warn(`  ✗ FAILED        ${r.paperCode}  — ${(e as Error).message}`);
    }
  }

  console.log(`\nDone. ${textOk} text-extracted, ${needsVision} need vision.`);
  await cmdStatus();
}

// ─── submit: create an Anthropic batch to structure questions ──────────────────

async function cmdSubmit() {
  ensureCacheDir();
  const ready = await prisma.resource.findMany({
    where: {
      type: "PAST_PAPER",
      ingestStatus: { in: ["TEXT_EXTRACTED", "NEEDS_VISION"] },
      paperCode: { not: null },
    },
  });
  if (ready.length === 0) {
    console.log("Nothing to submit. Run `ingest:extract` first.");
    return;
  }

  const requests: Anthropic.Messages.Batches.BatchCreateParams.Request[] = [];
  const idMapping: Record<string, string> = {}; // shortId → paperCode mapping

  for (const r of ready) {
    const userBlocks: Anthropic.ContentBlockParam[] = [];

    if (r.ingestStatus === "NEEDS_VISION") {
      // paperCode is the PDF's relative path without the .pdf extension.
      const pdfPath = join(PAPERS_ROOT, `${r.paperCode}.pdf`);
      const data = Buffer.from(await Bun.file(pdfPath).arrayBuffer()).toString("base64");
      userBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      });
      userBlocks.push({ type: "text", text: `Extract all questions from this ZIMSEC paper: ${r.title}.` });
    } else {
      const text = readFileSync(textCachePath(r.paperCode!), "utf8");
      userBlocks.push({
        type: "text",
        text: `Extract all questions from this ZIMSEC paper: ${r.title}.\n\n--- PAPER TEXT ---\n${text}`,
      });
    }

    const customId = shortCustomId(r.paperCode!);
    idMapping[customId] = r.paperCode!;

    requests.push({
      custom_id: customId,
      params: {
        model: STRUCTURING_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: [QUESTION_TOOL],
        tool_choice: { type: "tool", name: "submit_questions" },
        messages: [{ role: "user", content: userBlocks }],
      },
    });
  }

  console.log(`Submitting batch of ${requests.length} papers to Anthropic…`);
  const batch = await anthropic.messages.batches.create({ requests });
  writeFileSync(BATCH_FILE, JSON.stringify({ id: batch.id, createdAt: Date.now(), idMapping }, null, 2));
  console.log(`Batch created: ${batch.id}\nStatus: ${batch.processing_status}`);
  console.log(`Run \`bun run ingest:collect\` once it finishes (poll status with ingest:status).`);
}

// ─── collect: poll batch → PaperQuestion rows → ingested.json snapshot ─────────

async function cmdCollect() {
  if (!existsSync(BATCH_FILE)) {
    console.log("No batch.json found. Run `ingest:submit` first.");
    return;
  }
  const { id, idMapping } = JSON.parse(readFileSync(BATCH_FILE, "utf8")) as { id: string; idMapping?: Record<string, string> };
  const batch = await anthropic.messages.batches.retrieve(id);
  console.log(`Batch ${id} — ${batch.processing_status}`);
  if (batch.processing_status !== "ended") {
    console.log("Batch not finished yet. Try again later.");
    return;
  }

  let ingested = 0;
  let failed = 0;
  for await (const entry of await anthropic.messages.batches.results(id)) {
    // Reverse the custom_id back to paperCode using the mapping
    const paperCode = idMapping?.[entry.custom_id] ?? entry.custom_id.replace(/__/g, "/");
    const resource = await prisma.resource.findUnique({ where: { paperCode } });
    if (!resource) {
      console.warn(`  ? no Resource for ${paperCode}`);
      continue;
    }

    if (entry.result.type !== "succeeded") {
      await prisma.resource.update({
        where: { id: resource.id },
        data: { ingestStatus: "FAILED", ingestError: `batch: ${entry.result.type}` },
      });
      failed++;
      console.warn(`  ✗ ${paperCode} — ${entry.result.type}`);
      continue;
    }

    const toolUse = entry.result.message.content.find((b) => b.type === "tool_use");
    const questions = (toolUse as Anthropic.ToolUseBlock | undefined)?.input as
      | { questions: ExtractedQuestion[] }
      | undefined;

    // Guard: questions.questions must be a real array
    const rawArray: unknown = questions?.questions;
    if (!Array.isArray(rawArray) || rawArray.length === 0) {
      await prisma.resource.update({
        where: { id: resource.id },
        data: { ingestStatus: "FAILED", ingestError: "batch: no questions returned" },
      });
      failed++;
      console.warn(`  ✗ ${paperCode} — no questions`);
      continue;
    }

    // Sanity guard: a real exam paper never has more than 200 questions.
    // If Claude hallucinated a huge array (e.g. repeated empty objects), cap it.
    const MAX_QUESTIONS = 200;
    const capped = rawArray.length > MAX_QUESTIONS;
    const rawQuestions = (rawArray as ExtractedQuestion[]).slice(0, MAX_QUESTIONS);
    if (capped) {
      console.warn(`    ⚠ ${paperCode} — Claude returned ${rawArray.length} items; capped at ${MAX_QUESTIONS}`);
    }

    // Pre-filter: only keep entries that have actual text (skip empty objects early)
    const validQuestions = rawQuestions.filter(
      (q) => q && typeof q.text === "string" && q.text.trim().length > 0
    );

    if (validQuestions.length === 0) {
      await prisma.resource.update({
        where: { id: resource.id },
        data: { ingestStatus: "FAILED", ingestError: "batch: all returned questions had empty text" },
      });
      failed++;
      console.warn(`  ✗ ${paperCode} — no usable questions in Claude response`);
      continue;
    }

    // Replace any prior questions for this paper, then write fresh rows.
    await prisma.paperQuestion.deleteMany({ where: { resourceId: resource.id } });

    // Track used question numbers to handle duplicates from Claude
    const usedNumbers = new Set<number>();

    let written = 0;
    for (let idx = 0; idx < validQuestions.length; idx++) {
      const q = validQuestions[idx];

      // ── Defensive coercion: Claude occasionally omits or misnames fields ────
      // questionNumber: may be string, float, or missing → coerce to int, fall back to index+1
      let qNum = Number.isFinite(Number(q.questionNumber)) ? Math.round(Number(q.questionNumber)) : idx + 1;
      if (qNum <= 0) qNum = idx + 1;
      // Deduplicate: if this number is already used, just increment by 1 until free
      while (usedNumbers.has(qNum)) qNum++;
      usedNumbers.add(qNum);

      // aiModelAnswer: required — use a placeholder so we don't block ingestion
      const aiModelAnswer =
        typeof q.aiModelAnswer === "string" && q.aiModelAnswer.trim()
          ? q.aiModelAnswer.trim()
          : "Model answer not available — see official ZIMSEC marking guide.";

      await prisma.paperQuestion.create({
        data: {
          resourceId: resource.id,
          questionNumber: qNum,
          text: q.text.trim(),
          marks: Number.isFinite(Number(q.marks)) ? Math.round(Number(q.marks)) : 0,
          subParts: Array.isArray(q.subParts) && q.subParts.length ? q.subParts : undefined,
          section: q.section ?? null,
          topic: q.topic ?? null,
          pdfPage: Number.isFinite(Number(q.pdfPage)) ? Math.round(Number(q.pdfPage)) : null,
          hasDiagram: q.hasDiagram === true,
          diagramNote: q.diagramNote ?? null,
          aiModelAnswer,
          guideSource: "AI_GENERATED",
        },
      });
      written++;
    }

    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        ingestStatus: "INGESTED",
        ingestError: null,
        questionCount: written,
        ingestedAt: new Date(),
      },
    });
    ingested++;
    console.log(`  ✓ ${paperCode} — ${written} questions`);
  }

  console.log(`\nIngested ${ingested} papers, ${failed} failed.`);
  await writeSnapshot();
}

/** Dump all ingested papers + questions to ingested.json for zero-cost re-seeding. */
async function writeSnapshot() {
  const resources = await prisma.resource.findMany({
    where: { type: "PAST_PAPER", ingestStatus: "INGESTED" },
    include: { questions: { orderBy: { questionNumber: "asc" } } },
  });
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(resources, null, 2), "utf8");
  console.log(`Snapshot written: ingested.json (${resources.length} papers).`);
}

// ─── status ────────────────────────────────────────────────────────────────────

async function cmdStatus() {
  const rows = await prisma.resource.groupBy({
    by: ["ingestStatus"],
    where: { type: "PAST_PAPER" },
    _count: true,
  });
  const total = rows.reduce((s, r) => s + r._count, 0);
  console.log(`\nIngestion status (${total} past papers):`);
  for (const r of rows) console.log(`  ${r.ingestStatus.padEnd(16)} ${r._count}`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2];
const commands: Record<string, () => Promise<void>> = {
  extract: cmdExtract,
  submit: cmdSubmit,
  collect: cmdCollect,
  status: cmdStatus,
  snapshot: writeSnapshot,
};

const run = commands[cmd ?? ""];
if (!run) {
  console.error(`Usage: bun run ingest:<extract|submit|collect|status>`);
  process.exit(1);
}
run()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
