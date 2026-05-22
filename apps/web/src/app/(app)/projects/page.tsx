"use client";

import {
  Folder01Icon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface Project {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  category: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function ProjectSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardContent className="py-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </CardContent>
    </Card>
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
    <div className="mx-auto max-w-5xl animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your ZIMSEC Heritage-Based Curriculum projects
          </p>
        </div>
        <Button onClick={() => router.push("/projects/new")}>
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ProjectSkeleton />
          <ProjectSkeleton />
          <ProjectSkeleton />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <HugeiconsIcon icon={Folder01Icon} className="h-6 w-6 text-primary/40" />
          </div>
          <p className="text-base font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your generated HBC projects will appear here.
          </p>
          <Button className="mt-4" onClick={() => router.push("/projects/new")}>
            <HugeiconsIcon icon={SparklesIcon} className="mr-2 h-4 w-4" />
            Start New Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/projects/${p.id}`)}
              className="w-full text-left"
            >
              <Card className="rounded-xl transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] cursor-pointer hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]">
                <CardContent className="py-4 px-4">
                  <p className="text-sm font-semibold truncate">{p.topic}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.subject}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{p.grade}</Badge>
                      {p.category && (
                        <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
