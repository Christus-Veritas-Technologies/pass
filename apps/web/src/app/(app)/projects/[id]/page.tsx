"use client";

import {
  ArrowLeft01Icon,
  Download02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  content: string;
  category: string;
  studentName: string;
  centreNumber: string;
  candidateNumber: string;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5 text-foreground">{line.slice(4)}</h3>;
    if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mt-2 mb-3 text-foreground">{line.slice(2)}</h1>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="text-sm text-foreground ml-4 list-disc">{line.slice(2)}</li>;
    if (line.match(/^\d+\.\s/)) return <li key={i} className="text-sm text-foreground ml-4 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
    if (line.trim() === "") return <br key={i} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm text-foreground leading-relaxed mb-1">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
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
  }, [id]);

  function openHtml() {
    const token = getAccessToken();
    window.open(`${API}/projects/${id}/html${token ? `?token=${token}` : ""}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-border hover:bg-muted transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <h1 className="text-lg font-bold tracking-tight truncate">{project?.topic}</h1>
          )}
        </div>
        {project && (
          <Button variant="outline" size="sm" onClick={openHtml}>
            <HugeiconsIcon icon={Download02Icon} className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="rounded-xl">
          <CardContent className="py-6 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-xl">
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => router.push("/projects")}>Back to Projects</Button>
          </CardContent>
        </Card>
      ) : project ? (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="outline">{project.grade}</Badge>
            <span className="text-xs text-muted-foreground">{project.subject}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDate(project.createdAt)}</span>
          </div>

          <Card className="rounded-xl">
            <CardContent className="py-6 px-6">
              <div className="flex items-center gap-2 mb-5 text-xs text-primary">
                <HugeiconsIcon icon={SparklesIcon} className="h-3.5 w-3.5" />
                <span>ZIMSEC Heritage-Based Curriculum Project</span>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                {renderMarkdown(project.content)}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
