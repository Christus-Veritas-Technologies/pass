"use client";

import {
  ArrowLeft01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Download01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  category: string;
  studentName: string;
  centreNumber: string;
  candidateNumber: string;
  content: string;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZW", { day: "numeric", month: "long", year: "numeric" });
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# "))  return <h1 key={i} className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold text-foreground mt-5 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold text-foreground/80 mt-4 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2 text-sm text-foreground/80 leading-relaxed">
            <span className="text-primary mt-1.5 shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        if (line.match(/^\d+\.\s/)) return (
          <div key={i} className="flex gap-2 text-sm text-foreground/80 leading-relaxed ml-1">
            <span className="text-muted-foreground shrink-0">{line.match(/^\d+/)![0]}.</span>
            <span>{line.replace(/^\d+\.\s/, "")}</span>
          </div>
        );
        if (line.trim() === "") return <div key={i} className="h-2" />;
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm text-foreground/80 leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API}/projects/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d) => setProject(d.project))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-fade-up">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-lg" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-3xl text-center py-20">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/projects")}>
          ← Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        Back to Projects
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {project.category || "Heritage Project"}
            </p>
            <h1 className="text-xl font-bold text-foreground leading-snug mb-3">
              {project.topic}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{project.grade}</Badge>
              <span>·</span>
              <span>{project.subject}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Calendar01Icon} className="h-3 w-3" />
                {formatDate(project.createdAt)}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`${API}/projects/${project.id}/html`} target="_blank" rel="noopener noreferrer">
              <HugeiconsIcon icon={Download01Icon} className="mr-1.5 h-3.5 w-3.5" />
              Download PDF
            </a>
          </Button>
        </div>

        {/* Candidate meta */}
        {(project.studentName || project.centreNumber || project.candidateNumber) && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
            {project.studentName     && <span><strong className="text-foreground">Name:</strong> {project.studentName}</span>}
            {project.centreNumber    && <span><strong className="text-foreground">Centre:</strong> {project.centreNumber}</span>}
            {project.candidateNumber && <span><strong className="text-foreground">Candidate:</strong> {project.candidateNumber}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <MarkdownRenderer content={project.content} />
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5 text-emerald-500" />
          Generated by Pass AI
        </span>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <a href={`${API}/projects/${project.id}/html`} target="_blank" rel="noopener noreferrer">
            <HugeiconsIcon icon={Download01Icon} className="mr-1.5 h-3 w-3" />
            Print / Save as PDF
          </a>
        </Button>
      </div>
    </div>
  );
}
