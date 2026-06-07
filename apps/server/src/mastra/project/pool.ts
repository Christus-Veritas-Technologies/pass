/**
 * Project reuse pool.
 *
 * To avoid regenerating from scratch every time, generated project bodies are
 * stored (de-identified) in a per-(grade, subject) pool of up to POOL_SIZE
 * entries. Once the pool is full we STOP generating for that key and recycle
 * stored bodies round-robin, swapping in the new student's details at render
 * time (the body carries no identity — see ProjectTemplate in the schema).
 *
 *   request #1..#100  -> generate fresh, store at slot 0..99
 *   request #101      -> reuse slot 0 (the first project ever generated)
 *   request #102      -> reuse slot 1 ... #201 wraps back to slot 0
 *
 * Bespoke requests (student supplied their own title or outline) always
 * generate and are NEVER pooled.
 */

import prisma from "@pass/db";
import { generateProjectContent } from "./generate";
import type { ProjectInput } from "./spine";

export const POOL_SIZE = 100;

export type ResolveResult = {
  topic: string;
  content: string;
  /** true when served from the pool (no model call). */
  reused: boolean;
};

function isBespoke(input: ProjectInput): boolean {
  return !!(input.title?.trim() || input.outline?.trim());
}

/** Atomically claim the next round-robin slot for a full pool. */
async function nextReuseSlot(grade: string, subject: string): Promise<number> {
  const cursor = await prisma.projectPoolCursor.upsert({
    where: { grade_subject: { grade, subject } },
    create: { grade, subject, nextIndex: 1 },
    update: { nextIndex: { increment: 1 } },
  });
  return (cursor.nextIndex - 1) % POOL_SIZE;
}

/** Persist a freshly generated body into the next open pool slot (best effort). */
async function storeTemplate(grade: string, subject: string, topic: string, content: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const count = await prisma.projectTemplate.count({ where: { grade, subject } });
    if (count >= POOL_SIZE) return; // pool filled concurrently — nothing to do
    try {
      await prisma.projectTemplate.create({
        data: { grade, subject, topic, content, slot: count },
      });
      return;
    } catch {
      // Unique (grade, subject, slot) collision under concurrency — recompute and retry.
    }
  }
}

/**
 * Resolve project content for a request: either reuse a pooled body (no model
 * call) or generate a fresh one in parallel and pool it.
 * `onSection` is forwarded to the generator for progressive streaming; it is
 * NOT called on the reuse path.
 */
export async function resolveProjectContent(
  input: ProjectInput,
  opts: { onSection?: (markdown: string) => void } = {},
): Promise<ResolveResult> {
  const grade = input.grade;
  const subject = input.subject;

  if (!isBespoke(input)) {
    const count = await prisma.projectTemplate.count({ where: { grade, subject } });
    if (count >= POOL_SIZE) {
      const slot = await nextReuseSlot(grade, subject);
      const template =
        (await prisma.projectTemplate.findUnique({
          where: { grade_subject_slot: { grade, subject, slot } },
        })) ??
        // Defensive: if a slot is missing, fall back to the lowest-slot entry.
        (await prisma.projectTemplate.findFirst({
          where: { grade, subject },
          orderBy: { slot: "asc" },
        }));
      if (template) {
        return { topic: template.topic, content: template.content, reused: true };
      }
      // No template found despite count — fall through to generation.
    }
  }

  const { title, content } = await generateProjectContent(input, opts);
  if (!isBespoke(input)) {
    await storeTemplate(grade, subject, title, content).catch(() => undefined);
  }
  return { topic: title, content, reused: false };
}
