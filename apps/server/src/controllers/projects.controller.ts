import { streamSSE } from "hono/streaming";
import { readFile } from "node:fs/promises";
import type { Context } from "hono";

import prisma from "@pass/db";
import { resolveProjectContent } from "../mastra/project/pool";
import type { ProjectInput } from "../mastra/project/spine";
import { verifyAccessToken } from "../lib/jwt";
import { buildProjectHtml } from "../lib/projectHtml";
import { uploadProjectPdfBuffer } from "../whatsapp/media/renderProjectPdf";
import { generateProjectPdfBuffer } from "../lib/projectPdfDocument";
import { generateProjectDocxBuffer } from "../lib/projectDocxDocument";
import { sendNotification } from "../lib/notifications";
import { isValidSubject, canonicalSubject } from "../lib/subjects";
import { PLAN_LIMITS, currentMonthKey, nextMonthlyResetISO, type PlanKey, AMBASSADOR_LIMIT } from "../lib/planLimits";
import { effectivePlan } from "../lib/effectivePlan";

const VALID_GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verify token from Authorization header or ?token= query param. */
async function resolveUserId(c: Context): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");
  const rawToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (queryToken ?? null);

  if (!rawToken) return null;
  try {
    const payload = await verifyAccessToken(rawToken);
    return payload.sub;
  } catch {
    return null;
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function getProjects(c: Context) {
  const userId = c.get("userId") as string;
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ projects });
}

export async function getProject(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }
  return c.json({ project });
}

export async function generateProject(c: Context) {
  const userId = c.get("userId") as string;

  const body = await c.req.json().catch(() => null);
  if (!body?.subject || !body?.grade) {
    return c.json({ error: "subject and grade are required" }, 400);
  }

  const {
    centreNumber = "",
    candidateNumber = "",
    studentName = "",
    schoolName = "",
    grade,
    subject,
    isGroupProject = false,
    outline = "",
  } = body as {
    centreNumber?: string;
    candidateNumber?: string;
    studentName?: string;
    schoolName?: string;
    grade: string;
    subject: string;
    isGroupProject?: boolean;
    outline?: string;
  };

  if (!VALID_GRADES.includes(grade as (typeof VALID_GRADES)[number])) {
    return c.json({ error: `grade must be one of: ${VALID_GRADES.join(", ")}` }, 400);
  }

  if (centreNumber && !/^\d+$/.test(centreNumber.trim())) {
    return c.json({ error: "centreNumber must contain digits only" }, 400);
  }
  if (candidateNumber && !/^\d+$/.test(candidateNumber.trim())) {
    return c.json({ error: "candidateNumber must contain digits only" }, 400);
  }

  const subjectKey = subject.trim();
  if (!isValidSubject(subjectKey)) {
    return c.json({ error: `"${subject}" is not a recognised ZIMSEC subject. Check the spelling and try again (e.g. Mathematics, Biology, History).` }, 400);
  }
  // Use the canonical (properly-cased) name throughout
  const canonicalSub = canonicalSubject(subjectKey) ?? subjectKey;

  // ── Quota enforcement ─────────────────────────────────────────────────────────
  {
    const month = currentMonthKey();
    const quotaUser = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, isAmbassador: true } });
    if (quotaUser) {
      // Effective plan downgrades an expired subscriber to FREE limits even if
      // the daily expiry cron hasn't run yet.
      const plan = quotaUser.isAmbassador ? quotaUser.plan : await effectivePlan(userId, quotaUser.plan);
      const projectLimit = quotaUser.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[plan as PlanKey].projects;

      // Atomically consume one project if under the limit, else fall back to a
      // bonus credit (also atomic) — no read-then-act race on either counter.
      await prisma.monthlyUsage.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, papersUsed: 0, projectsUsed: 0 },
        update: {},
      });
      const consumed = await prisma.monthlyUsage.updateMany({
        where: { userId_month: { userId, month }, projectsUsed: { lt: projectLimit } },
        data: { projectsUsed: { increment: 1 } },
      });
      if (consumed.count === 0) {
        const bonus = quotaUser.isAmbassador
          ? { count: 0 }
          : await prisma.user.updateMany({
              where: { id: userId, bonusProjects: { gt: 0 } },
              data: { bonusProjects: { decrement: 1 } },
            });
        if (bonus.count === 0) {
          return c.json({ error: "Monthly project limit reached for your plan", limitReached: true, plan, limit: projectLimit, resetsOn: nextMonthlyResetISO() }, 402);
        }
      }
    }
  }

  const input: ProjectInput = {
    grade,
    subject: canonicalSub,
    title: "", // web flow does not collect a student-chosen title
    outline,
    isGroupProject,
  };

  let projectId: string | null = null;
  let accumulatedContent = "";

  return streamSSE(c, async (stream) => {
    try {
      await stream.writeSSE({ data: "ok", event: "connected" }).catch(() => null);
      const project = await prisma.project.create({
        data: {
          userId,
          grade,
          subject: canonicalSub,
          topic: "",
          content: "",
          outline: outline.trim() || null,
          centreNumber,
          candidateNumber,
          studentName,
          schoolName,
          category: "",
        },
      });
      projectId = project.id;

      await stream.writeSSE({ data: projectId, event: "project_id" });

      // Either generate in parallel (streaming sections as they land) or reuse a
      // pooled body. resolveProjectContent only calls onSection on the generate path.
      let streamedAny = false;
      const { topic, content, reused } = await resolveProjectContent(input, {
        onSection: (md) => {
          streamedAny = true;
          void stream.writeSSE({ data: md, event: "chunk" }).catch(() => null);
        },
      });
      accumulatedContent = content;

      // Reuse path (no streaming happened): deliver the body to the client in chunks.
      if (reused || !streamedAny) {
        for (let i = 0; i < content.length; i += 1500) {
          await stream.writeSSE({ data: content.slice(i, i + 1500), event: "chunk" }).catch(() => null);
        }
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { content, topic },
      });

      // Notify the user on all connected channels (push + WhatsApp if linked)
      sendNotification(userId, "project_generated", { projectId, topic }).catch(() => null);

      await stream.writeSSE({ data: projectId, event: "done" }).catch(() => null);
    } catch (err) {
      console.error("generateProject stream error:", err);
      if (projectId && !accumulatedContent) {
        await prisma.project.delete({ where: { id: projectId } }).catch(() => null);
      }
      await stream.writeSSE({ data: "AI response unavailable.", event: "error" }).catch(() => null);
    }
  });
}

/** GET /projects/:id/html — screen-mode preview (iframe embed) */
export async function getProjectHtml(c: Context) {
  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const html = buildProjectHtml(project, "screen");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** GET /projects/:id/pdf — download as real PDF (puppeteer-rendered) */
export async function getProjectPdf(c: Context) {
  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  // If we already have a cached PDF, stream it straight back
  if (project.pdfUrl && !project.pdfUrl.startsWith("file://")) {
    try {
      const resp = await fetch(project.pdfUrl);
      if (resp.ok) {
        const bytes = new Uint8Array(await resp.arrayBuffer());
        return pdfResponse(c, bytes, project);
      }
    } catch {
      // Cache miss — fall through to regenerate
    }
  }
  if (project.pdfUrl?.startsWith("file://")) {
    try {
      const bytes = await readFile(project.pdfUrl.replace("file://", ""));
      // Pass Buffer directly — avoids the .buffer byteOffset pitfall
      return pdfResponse(c, bytes, project);
    } catch {
      // Tmp file gone — fall through to regenerate
    }
  }

  // Generate PDF using PDFKit
  let pdfBytes: Buffer;
  try {
    pdfBytes = await generateProjectPdfBuffer(project);
  } catch (err) {
    console.error("[pdf] generation failed:", err);
    return c.json({ error: "PDF generation failed. Please try again." }, 500);
  }

  // Upload same bytes to R2 for caching — skip re-rendering (non-fatal)
  uploadProjectPdfBuffer(project, pdfBytes).catch(() => null);

  return pdfResponse(c, pdfBytes, project);
}

/** GET /projects/:id/docx — download as Word document */
export async function getProjectDocx(c: Context) {
  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  let docxBytes: Buffer;
  try {
    docxBytes = await generateProjectDocxBuffer(project);
  } catch (err) {
    console.error("[docx] generation failed:", err);
    return c.json({ error: "Document generation failed. Please try again." }, 500);
  }

  const safeTitle = (project.topic || "project").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
  const suffix = project.candidateNumber && project.candidateNumber !== "_"
    ? `_${project.candidateNumber}`
    : `_${project.id.slice(-6)}`;
  const filename = `HBC_${safeTitle}${suffix}.docx`;

  return new Response(docxBytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

function pdfResponse(_c: Context, bytes: Uint8Array | ArrayBuffer, project: { topic: string; candidateNumber: string; id: string }) {
  const safeTitle = (project.topic || "project").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
  const suffix = project.candidateNumber ? `_${project.candidateNumber}` : `_${project.id.slice(-6)}`;
  const filename = `HBC_${safeTitle}${suffix}.pdf`;

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
