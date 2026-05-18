"use client";

import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Folder01Icon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { getAccessToken } from "@/lib/auth";

const SUBJECTS = [
  "Mathematics", "English Language", "Combined Science", "Chemistry",
  "Biology", "History", "Geography", "English Literature", "Shona", "Physics",
];
const GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface Project {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  content: string;
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
      </CardContent>
    </Card>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);

  // Form state
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade]     = useState(GRADES[3]);
  const [topic, setTopic]     = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [genError, setGenError]     = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function fetchProjects() {
    setLoading(true);
    const token = getAccessToken();
    fetch(`${API}/projects`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchProjects(); }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setGenerating(true);
    setStreamedContent("");
    setGenError("");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/projects/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject, grade, topic: topic.trim() }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newProjectId = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: project_id")) continue;
          if (line.startsWith("event: done")) {
            // Done — refresh list
            await fetchProjects();
            break;
          }
          if (line.startsWith("event: error")) {
            setGenError("AI generation failed. Please try again.");
          }
          if (line.startsWith("data: ")) {
            const chunk = line.slice(6);
            // The project_id event sends the id as data before chunks
            if (chunk.startsWith("proj_") && newProjectId === "") {
              newProjectId = chunk;
            } else {
              setStreamedContent((prev) => prev + chunk);
            }
          }
        }
      }

      setShowForm(false);
      setTopic("");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setGenError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  const displayContent = selected?.content ?? streamedContent;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated study guides for any topic.
          </p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setSelected(null); setStreamedContent(""); }}>
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: list + form */}
        <div className="space-y-4">
          {/* Generate form */}
          {showForm && (
            <Card className="rounded-xl border-primary/30 bg-primary/5">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4 text-primary" />
                  Generate a study project
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <form onSubmit={handleGenerate} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Grade</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {GRADES.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Quadratic Equations"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>

                  {genError && (
                    <p className="text-xs text-destructive">{genError}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button type="submit" disabled={generating || !topic.trim()} className="flex-1">
                      {generating ? (
                        <>
                          <HugeiconsIcon icon={SparklesIcon} className="mr-2 h-4 w-4 animate-pulse" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={SparklesIcon} className="mr-2 h-4 w-4" />
                          Generate
                        </>
                      )}
                    </Button>
                    {generating && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => abortRef.current?.abort()}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Projects list */}
          {loading ? (
            <>
              <ProjectSkeleton />
              <ProjectSkeleton />
            </>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <HugeiconsIcon icon={Folder01Icon} className="h-5 w-5 text-primary/40" />
              </div>
              <p className="text-sm font-medium">No projects yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Generate your first AI study guide.</p>
              <button
                onClick={() => { setShowForm(true); setSelected(null); setStreamedContent(""); }}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
              >
                <HugeiconsIcon icon={SparklesIcon} className="h-3.5 w-3.5" />
                Generate guide
              </button>
            </div>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelected(p); setShowForm(false); setStreamedContent(""); }}
                className="w-full text-left"
              >
                <Card className={`rounded-xl transition-all cursor-pointer hover:shadow-md ${selected?.id === p.id ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="py-3 px-4">
                    <p className="text-sm font-medium truncate">{p.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.subject} · {p.grade}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">{p.grade}</Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          )}
        </div>

        {/* Right: content viewer */}
        <div>
          {generating && streamedContent === "" ? (
            <Card className="rounded-xl h-full">
              <CardContent className="py-8 flex flex-col items-center justify-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                  <HugeiconsIcon icon={SparklesIcon} className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Generating your study guide…</p>
              </CardContent>
            </Card>
          ) : displayContent ? (
            <Card className="rounded-xl">
              <CardContent className="py-5 px-5">
                {generating && (
                  <div className="flex items-center gap-2 mb-4 text-xs text-primary">
                    <HugeiconsIcon icon={SparklesIcon} className="h-3.5 w-3.5 animate-pulse" />
                    Writing…
                  </div>
                )}
                {!generating && selected && (
                  <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5 text-emerald-500" />
                    {selected.subject} · {selected.grade} · {timeAgo(selected.createdAt)}
                  </div>
                )}
                <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                  {displayContent.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
                    if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5 text-foreground">{line.slice(4)}</h3>;
                    if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mt-2 mb-3 text-foreground">{line.slice(2)}</h1>;
                    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="text-sm text-foreground ml-4 list-disc">{line.slice(2)}</li>;
                    if (line.match(/^\d+\.\s/)) return <li key={i} className="text-sm text-foreground ml-4 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
                    if (line.trim() === "") return <br key={i} />;
                    // Bold + inline code
                    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
                    return (
                      <p key={i} className="text-sm text-foreground leading-relaxed mb-1">
                        {parts.map((part, j) => {
                          if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
                          if (part.startsWith("`") && part.endsWith("`")) return <code key={j} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <HugeiconsIcon icon={Folder01Icon} className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Select a project to read</p>
              <p className="mt-1 text-xs">or generate a new one with the button above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
