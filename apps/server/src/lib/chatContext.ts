/**
 * In-app chat attachment context loaders.
 *
 * When a student attaches one of their own in-app objects (a past paper, a
 * practice session, a resource, or a project) to a chat message, we load it
 * from the real models and format a short, labelled text block that is
 * prepended to the prompt. This is plain text — no vision needed — so these
 * messages flow through the normal agent path and stay free (cost 1).
 *
 * Every loader that reads user-owned data is scoped to `userId` so a student
 * can never inject another student's session or project by guessing an id.
 */

import prisma from "@pass/db";

/** A validated in-app attachment ref (the `upload` kind is handled separately). */
export type InAppAttachment =
  | { kind: "paper"; refId: string }
  | { kind: "session"; refId: string }
  | { kind: "resource"; refId: string }
  | { kind: "project"; refId: string };

// Keep injected blocks bounded so a large paper/project can't blow the context.
const MAX_QUESTIONS = 20;
const MAX_PROJECT_CHARS = 6000;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}\n…(truncated)` : s;
}

async function loadPaper(resourceId: string): Promise<string | null> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { questions: { orderBy: { questionNumber: "asc" }, take: MAX_QUESTIONS } },
  });
  if (!resource) return null;

  const lines = [
    `[Referenced past paper: ${resource.title} — ${resource.subject} ${resource.grade} ${resource.year}]`,
  ];
  for (const q of resource.questions) {
    lines.push(`Q${q.questionNumber} (${q.marks}m): ${q.text}`);
    if (q.aiModelAnswer) lines.push(`  Model points: ${truncate(q.aiModelAnswer, 400)}`);
  }
  if (resource.questionCount > resource.questions.length) {
    lines.push(`…(${resource.questionCount - resource.questions.length} more questions not shown)`);
  }
  return lines.join("\n");
}

async function loadSession(sessionId: string, userId: string): Promise<string | null> {
  const session = await prisma.paperSession.findFirst({
    where: { id: sessionId, userId },
    include: { resource: true, questionAttempts: { orderBy: { questionNumber: "asc" } } },
  });
  if (!session) return null;

  const lines = [
    `[Your practice session on ${session.resource.title} (${session.resource.subject} ${session.resource.grade}): ${session.questionsAnswered} answered]`,
  ];
  for (const a of session.questionAttempts) {
    const verdict = a.correct == null ? "ungraded" : a.correct ? "correct" : "incorrect";
    lines.push(`Q${a.questionNumber}: ${a.questionText}`);
    lines.push(`  Your answer: ${truncate(a.userAnswer, 500)}  → ${verdict}`);
    const evaluation = a.evaluation as { feedback?: string } | null;
    if (evaluation?.feedback) lines.push(`  Feedback: ${truncate(evaluation.feedback, 400)}`);
  }
  return lines.join("\n");
}

async function loadResource(resourceId: string): Promise<string | null> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { questions: { orderBy: { questionNumber: "asc" }, take: MAX_QUESTIONS } },
  });
  if (!resource) return null;

  const lines = [
    `[Referenced resource: ${resource.title} — ${resource.type} ${resource.subject} ${resource.grade}]`,
  ];
  for (const q of resource.questions) {
    lines.push(`Q${q.questionNumber}: ${q.text}`);
  }
  if (resource.questions.length === 0) {
    lines.push("(No extracted text available — refer to the resource by title and subject.)");
  }
  return lines.join("\n");
}

async function loadProject(projectId: string, userId: string): Promise<string | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) return null;

  return [
    `[Your project: ${project.subject} ${project.grade} — ${project.topic}]`,
    truncate(project.content, MAX_PROJECT_CHARS),
  ].join("\n");
}

/**
 * Resolve one in-app attachment to a formatted context block, or null when the
 * referenced object does not exist or is not owned by this user.
 */
export async function loadAttachmentContext(
  att: InAppAttachment,
  userId: string,
): Promise<string | null> {
  switch (att.kind) {
    case "paper":
      return loadPaper(att.refId);
    case "session":
      return loadSession(att.refId, userId);
    case "resource":
      return loadResource(att.refId);
    case "project":
      return loadProject(att.refId, userId);
  }
}

/** Build the combined context preamble for all in-app attachments on a message. */
export async function buildAttachmentContext(
  attachments: InAppAttachment[],
  userId: string,
): Promise<string> {
  const blocks = await Promise.all(attachments.map((a) => loadAttachmentContext(a, userId)));
  return blocks.filter((b): b is string => b != null).join("\n\n");
}
