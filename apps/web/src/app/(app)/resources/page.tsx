"use client";

import {
  BookOpen01Icon,
  Download01Icon,
  FilterIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { cn } from "@/lib/utils";

const SUBJECTS = ["All", "Mathematics", "English Language", "Combined Science", "History", "Geography", "Chemistry", "Biology", "English Literature", "Shona"];
const GRADES = ["All", "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];
const YEARS = ["All", "2023", "2022", "2021", "2020"];
const TYPES = ["All", "PAST_PAPER", "MARKING_GUIDE", "SYLLABUS"] as const;
const TYPE_LABELS: Record<string, string> = {
  All: "All",
  PAST_PAPER: "Past Papers",
  MARKING_GUIDE: "Marking Guides",
  SYLLABUS: "Syllabi",
};
const TYPE_VARIANT: Record<string, "default" | "success" | "warning" | "outline"> = {
  PAST_PAPER: "default",
  MARKING_GUIDE: "success",
  SYLLABUS: "warning",
};

interface Resource {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
  type: string;
  fileUrl: string;
}

const API = process.env.NEXT_PUBLIC_SERVER_URL;

function ResourceSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
      <Skeleton className="h-3 w-1/3 rounded" />
    </div>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [grade, setGrade] = useState("All");
  const [type, setType] = useState("All");
  const [year, setYear] = useState("All");

  useEffect(() => {
    const params = new URLSearchParams();
    if (subject !== "All") params.set("subject", subject);
    if (grade !== "All") params.set("grade", grade);
    if (type !== "All") params.set("type", type);
    if (year !== "All") params.set("year", year);

    setLoading(true);
    fetch(`${API}/resources?${params}`)
      .then((r) => r.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [subject, grade, type, year]);

  const filtered = search.trim()
    ? resources.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.subject.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Past papers, marking guides, and syllabi for every subject.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search by title or subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Type tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="py-4 space-y-3">
                <ResourceSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <HugeiconsIcon icon={BookOpen01Icon} className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No resources found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Card key={r.id} className="rounded-xl">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant={TYPE_VARIANT[r.type] ?? "outline"} className="shrink-0">
                      {TYPE_LABELS[r.type] ?? r.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.year}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug mb-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground mb-4">{r.subject} · {r.grade}</p>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="h-3.5 w-3.5" />
                    Download
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
