"use client";

import {
  BookOpen01Icon,
  Calendar01Icon,
  Folder01Icon,
  PlusSignIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: "default" | "success" | "warning" | "outline" }> = {
  "Culture & History":    { bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-600 dark:text-amber-400",   badge: "warning" },
  "Indigenous Sciences":  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", badge: "success" },
  "Arts & Lifestyle":     { bg: "bg-violet-50 dark:bg-violet-950/30",  text: "text-violet-600 dark:text-violet-400",  badge: "default" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZW", { day: "numeric", month: "short", year: "numeric" });
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-2/3 rounded-lg" />
      <Skeleton className="h-3 w-1/2 rounded-lg" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API}/projects`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your ZIMSEC Heritage-Based Curriculum projects
          </p>
        </div>
        <Button onClick={() => router.push("/projects/new")} className="shrink-0">
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 mb-5">
            <HugeiconsIcon icon={Folder01Icon} className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-base font-semibold">No projects yet</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
            Generate your first ZIMSEC HBC project. The AI writes a complete, formally structured document — you just provide your candidate details.
          </p>
          <Button onClick={() => router.push("/projects/new")} className="mt-6">
            <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
            Start New Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const style = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS["Culture & History"]!;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group rounded-2xl border border-border bg-card p-5 transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md block"
              >
                {/* Category icon strip */}
                <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 mb-3 ${style.bg}`}>
                  <HugeiconsIcon icon={BookOpen01Icon} className={`h-3.5 w-3.5 ${style.text}`} />
                  <span className={`text-xs font-semibold ${style.text}`}>{p.category || "Heritage Project"}</span>
                </div>

                {/* Title */}
                <p className="font-semibold text-foreground leading-snug line-clamp-2 mb-1">
                  {p.topic}
                </p>

                {/* Subject + grade */}
                <p className="text-xs text-muted-foreground mb-3">
                  {p.subject} · {p.grade}
                </p>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-medium">{p.grade}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={Calendar01Icon} className="h-3 w-3" />
                    {formatDate(p.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
