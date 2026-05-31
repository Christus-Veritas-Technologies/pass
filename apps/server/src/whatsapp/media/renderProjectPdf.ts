/**
 * Renders a project to PDF using @react-pdf/renderer and uploads to R2.
 *
 * Exports:
 *  setBrowser      — no-op kept for API compatibility with whatsapp/client.ts
 *  renderProjectPdfAndUpload — full pipeline: PDF bytes → R2 → public URL
 *  estimatePageCount
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@pass/env/server";
import prisma from "@pass/db";
import type { Project } from "@pass/db";
import { generateProjectPdfBuffer } from "../../lib/projectPdfDocument";

// ── Puppeteer browser ref (kept for WhatsApp session — NOT used for PDF) ─────

interface PuppeteerBrowser {
  newPage(): Promise<unknown>;
}

/**
 * No-op kept for API compatibility with whatsapp/client.ts.
 * PDF rendering now uses @react-pdf/renderer — no browser needed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setBrowser(_b: PuppeteerBrowser): void {
  /* no-op */
}

/** No longer meaningful for PDF rendering, kept for API compatibility. */
export function isBrowserReady(): boolean {
  // @react-pdf/renderer doesn't need a browser — always ready
  return true;
}

/**
 * Render a project to PDF bytes using @react-pdf/renderer.
 * Always succeeds (no Puppeteer / browser dependency).
 */
async function projectToPdfBytes(project: Project): Promise<Buffer> {
  return generateProjectPdfBuffer(project);
}

/**
 * Render a project PDF and upload it to R2. Returns the public URL.
 * Throws if R2 is not configured.
 */
export async function renderProjectPdfAndUpload(
  project: Project,
): Promise<string> {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    throw new Error("R2 storage is not configured — cannot store project PDF");
  }

  const pdfBytes = await projectToPdfBytes(project);
  const key = `projects/${project.id}.pdf`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: pdfBytes,
      ContentType: "application/pdf",
    }),
  );

  const publicUrl = `${env.R2_PUBLIC_URL?.replace(/\/$/, "")}/${key}`;
  await prisma.project.update({
    where: { id: project.id },
    data: { pdfUrl: publicUrl },
  });
  return publicUrl;
}

/**
 * Upload pre-generated PDF bytes to R2 without re-rendering the document.
 * Use this when you already have the buffer (e.g. from getProjectPdf) to avoid
 * calling @react-pdf/renderer twice for the same project.
 */
export async function uploadProjectPdfBuffer(
  project: Project,
  pdfBytes: Buffer,
): Promise<string> {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    throw new Error("R2 storage is not configured — cannot store project PDF");
  }

  const key = `projects/${project.id}.pdf`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: pdfBytes,
      ContentType: "application/pdf",
    }),
  );

  const publicUrl = `${env.R2_PUBLIC_URL?.replace(/\/$/, "")}/${key}`;
  await prisma.project.update({
    where: { id: project.id },
    data: { pdfUrl: publicUrl },
  });
  return publicUrl;
}

export function estimatePageCount(content: string): number {
  const lines = content.split("\n").filter(Boolean).length;
  return Math.max(1, Math.ceil(lines / 40));
}
