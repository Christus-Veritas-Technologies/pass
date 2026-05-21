/**
 * Renders a project's markdown content to PDF using Puppeteer
 * (already loaded in-process by whatsapp-web.js) and uploads to R2.
 *
 * Falls back gracefully when R2 is not configured: saves PDF to a tmp
 * file and returns a file:// URL so the caller can still send it.
 */

import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile } from "node:fs/promises";
import { marked } from "marked";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@pass/env/server";
import prisma from "@pass/db";
import type { Project } from "@pass/db";

interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
}
interface PuppeteerPage {
  setContent(html: string, options?: { waitUntil?: string }): Promise<void>;
  pdf(options?: { format?: string; margin?: Record<string, string> }): Promise<Uint8Array>;
  close(): Promise<void>;
}

let _browser: PuppeteerBrowser | null = null;
export function setBrowser(b: PuppeteerBrowser): void { _browser = b; }

const STYLES = `
  body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 40px; color: #222; }
  h1 { font-size: 18pt; text-align: center; }
  h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 28px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #aaa; padding: 6px 10px; text-align: left; }
  th { background: #f0f0f0; }
  code { background: #f5f5f5; padding: 1px 4px; border-radius: 2px; font-size: 10pt; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
`;

async function markdownToPdfBytes(markdown: string): Promise<Buffer | null> {
  if (!_browser) return null;
  const html =
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<style>${STYLES}</style></head><body>${await marked(markdown)}</body></html>`;

  const page = await _browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function renderProjectPdfAndUpload(project: Project): Promise<string | null> {
  const pdfBytes = await markdownToPdfBytes(project.content);
  if (!pdfBytes) return null;

  const key = `projects/${project.id}.pdf`;

  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME) {
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
    await prisma.project.update({ where: { id: project.id }, data: { pdfUrl: publicUrl } });
    return publicUrl;
  }

  // Fallback: write to tmp
  const tmpPath = join(tmpdir(), `pass-project-${project.id}.pdf`);
  await writeFile(tmpPath, pdfBytes);
  return `file://${tmpPath}`;
}

export function estimatePageCount(content: string): number {
  const lines = content.split("\n").filter(Boolean).length;
  return Math.max(1, Math.ceil(lines / 40));
}
