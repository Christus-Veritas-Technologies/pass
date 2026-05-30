"use client";

import {
  ArrowLeft01Icon,
  Download02Icon,
  Home01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Skeleton } from "@pass/ui/components/skeleton";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface Project {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  studentName: string;
  centreNumber: string;
  candidateNumber: string;
  createdAt: string;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iframeLoading, setIframeLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const token = getAccessToken();

  useEffect(() => {
    fetch(`${API}/projects/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProject(d.project);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview uses the /html endpoint (screen mode — gray background, white A4 card)
  const iframeSrc = `${API}/projects/${id}/html${token ? `?token=${token}` : ""}`;
  // PDF download uses /pdf endpoint → triggers real browser download
  const pdfSrc = `${API}/projects/${id}/pdf${token ? `?token=${token}` : ""}`;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(pdfSrc);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "PDF unavailable");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Use filename from Content-Disposition if available
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `${project?.topic ?? "project"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert((err as Error).message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadDocx() {
    if (downloadingDocx) return;
    setDownloadingDocx(true);
    try {
      const docxSrc = `${API}/projects/${id}/docx${token ? `?token=${token}` : ""}`;
      const res = await fetch(docxSrc);
      if (!res.ok) throw new Error("Document unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `${project?.topic ?? "project"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert((err as Error).message || "Download failed. Please try again.");
    } finally {
      setDownloadingDocx(false);
    }
  }

  return (
    // Break out of layout's p-6 padding; fill the entire visible main area
    <div className="-m-6 flex flex-col h-[calc(100dvh-3.5rem)] lg:h-[100dvh] overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">

        {/* Back to projects list */}
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
          aria-label="Back to projects"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </button>

        {/* Project title + metadata */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ) : error ? (
            <span className="text-sm text-destructive truncate">Failed to load project</span>
          ) : project ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate">{project.topic}</span>
              <Badge variant="outline" className="shrink-0 text-xs">{project.grade}</Badge>
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                {project.subject}
              </span>
            </div>
          ) : null}
        </div>

        {/* Download as Word Document (secondary) */}
        <button
          type="button"
          onClick={handleDownloadDocx}
          disabled={loading || !!error || downloadingDocx}
          className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-40 hidden sm:block"
        >
          {downloadingDocx ? "Preparing…" : "Download as Word Document"}
        </button>

        {/* Download as PDF */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={loading || !!error || downloading}
          className="shrink-0 gap-1.5"
        >
          {downloading ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Generating…</span>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Download02Icon} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </>
          )}
        </Button>
      </div>

      {/* ── Viewer ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        {error ? (
          /* Error state */
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => router.push("/projects")}>
              <HugeiconsIcon icon={Home01Icon} className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        ) : (
          <>
            {/* Shimmer overlay while iframe loads */}
            {iframeLoading && (
              <div className="absolute inset-0 z-10 bg-[#e8eaed] flex flex-col items-center px-8 pt-8 pointer-events-none">
                <div className="bg-white w-full max-w-[794px] rounded-sm shadow-md px-14 pt-16 pb-8 flex flex-col gap-4">
                  <Skeleton className="h-6 w-56 mx-auto" />
                  <Skeleton className="h-4 w-40 mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto mb-6" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className={`h-3 ${i % 4 === 3 ? "w-3/4" : "w-full"}`} />
                  ))}
                </div>
              </div>
            )}

            {/* HTML preview — screen mode gives it the PDF paper look */}
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title={project?.topic ?? "Project"}
              onLoad={() => setIframeLoading(false)}
            />
          </>
        )}
      </div>
    </div>
  );
}
