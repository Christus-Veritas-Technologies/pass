"use client";

import {
  BookOpen01Icon,
  Download01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";

const LEVELS = [
  { label: "All Levels", value: "All" },
  { label: "A-Level",    value: "A-Level" },
  { label: "O-Level",    value: "O-Level" },
  { label: "Grade 7",    value: "Grade-7" },
] as const;

const SUBJECTS = ["All", "Mathematics", "English Language", "Combined Science", "History", "Geography", "Chemistry", "Biology", "English Literature", "Shona", "Physics", "Accounting", "Agriculture", "Art", "Sociology"];
const YEARS = ["All", "2026", "2025", "2024", "2023", "2022", "2021", "2020"];
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

const TYPE_ICON_STYLE: Record<string, { bg: string; text: string }> = {
  PAST_PAPER: { bg: "bg-violet-50", text: "text-violet-600" },
  MARKING_GUIDE: { bg: "bg-emerald-50", text: "text-emerald-600" },
  SYLLABUS: { bg: "bg-amber-50", text: "text-amber-600" },
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
const PAGE_SIZE = 10;

function Pagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={page === 1}
        className="text-xs h-8 px-3"
      >
        ‹ Prev
      </Button>
      <span className="text-xs text-muted-foreground">
        {from}–{to} of {total}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={page === totalPages}
        className="text-xs h-8 px-3"
      >
        Next ›
      </Button>
    </div>
  );
}

function ResourceSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardContent className="py-4 space-y-2.5">
        <Skeleton className="h-3.5 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
        <Skeleton className="h-6 w-24 rounded-lg mt-2" />
      </CardContent>
    </Card>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");
  const [year, setYear] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subject !== "All") params.set("subject", subject);
    if (level !== "All") params.set("grade", level);
    if (type !== "All") params.set("type", type);
    if (year !== "All") params.set("year", year);

    setLoading(true);
    setPage(1);
    fetch(`${API}/resources?${params}`)
      .then((r) => r.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [level, subject, type, year]);

  const filtered = search.trim()
    ? resources.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.subject.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pagedFiltered = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = level !== "All" || subject !== "All" || type !== "All" || year !== "All" || !!search;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
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
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-xl border border-input bg-background hover:border-primary/40 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-[box-shadow] duration-150"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        {/* Level tabs — first row */}
        <div className="flex rounded-xl border border-border overflow-hidden w-fit">
          {LEVELS.map((l) => (
            <Button
              key={l.value}
              onClick={() => setLevel(l.value)}
              variant={level === l.value ? "default" : "ghost"}
              className="px-3.5 py-1.5 text-xs font-medium rounded-none"
            >
              {l.label}
            </Button>
          ))}
        </div>

        {/* Type + subject + year — second row */}
        <div className="flex flex-wrap gap-2.5">
          {/* Type tabs */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {TYPES.map((t) => (
              <Button
                key={t}
                onClick={() => setType(t)}
                variant={type === t ? "default" : "ghost"}
                className="px-3 py-1.5 text-xs font-medium rounded-none"
              >
                {TYPE_LABELS[t]}
              </Button>
            ))}
          </div>

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
          >
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
          >
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>

          {hasFilters && (
            <Button
              variant="ghost"
              className="text-xs px-3 py-1.5 h-auto text-muted-foreground"
              onClick={() => { setLevel("All"); setSubject("All"); setType("All"); setYear("All"); setSearch(""); setPage(1); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <ResourceSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 mb-4">
            <HugeiconsIcon icon={BookOpen01Icon} className="h-5 w-5 text-primary/40" />
          </div>
          <p className="text-sm font-medium">
            {resources.length === 0 ? "No resources yet" : "No matches"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {resources.length === 0
              ? "Resources will appear here once they're added."
              : search.trim()
              ? `Nothing for "${search}".`
              : "Clear your filters to see all resources."}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setLevel("All"); setSubject("All"); setType("All"); setYear("All"); setSearch(""); setPage(1); }}
              className="mt-4 text-xs text-primary hover:underline transition-colors duration-100"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="animate-fade-up">
          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length === 0
              ? "0 results"
              : totalPages > 1
              ? `${from}–${to} of ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
              : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pagedFiltered.map((r) => (
              <Card
                key={r.id}
                className="rounded-xl transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-sm"
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${(TYPE_ICON_STYLE[r.type] ?? TYPE_ICON_STYLE.PAST_PAPER).bg}`}>
                      <HugeiconsIcon icon={BookOpen01Icon} className={`h-4 w-4 ${(TYPE_ICON_STYLE[r.type] ?? TYPE_ICON_STYLE.PAST_PAPER).text}`} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <Badge variant={TYPE_VARIANT[r.type] ?? "outline"} className="shrink-0 text-xs">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{r.year}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold leading-snug mb-0.5 line-clamp-2">{r.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{r.subject} · {r.grade}</p>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-[0.97] transition-[transform,background-color] duration-100 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${(TYPE_ICON_STYLE[r.type] ?? TYPE_ICON_STYLE.PAST_PAPER).bg} ${(TYPE_ICON_STYLE[r.type] ?? TYPE_ICON_STYLE.PAST_PAPER).text}`}
                  >
                    <HugeiconsIcon icon={Download01Icon} className="h-3 w-3" />
                    Download
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            from={from}
            to={to}
            total={filtered.length}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}
    </div>
  );
}
