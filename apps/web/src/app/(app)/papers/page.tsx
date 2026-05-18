"use client";

import {
  BookOpen01Icon,
  Calendar01Icon,
  ArrowRight01Icon,
  Search01Icon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { Button } from "@pass/ui/components/button";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "All", "Mathematics", "English Language", "Combined Science",
  "Chemistry", "Biology", "History", "Geography", "English Literature", "Shona",
];
const GRADES = ["All", "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];
const YEARS  = ["All", "2023", "2022", "2021", "2020", "2019"];

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
}

const API = process.env.NEXT_PUBLIC_SERVER_URL;

function PaperSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardContent className="py-4 space-y-3">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [grade, setGrade]     = useState("All");
  const [year, setYear]       = useState("All");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/papers`)
      .then((r) => r.json())
      .then((d) => setPapers(d.papers ?? []))
      .catch(() => setPapers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = papers.filter((p) => {
    if (subject !== "All" && p.subject !== subject) return false;
    if (grade   !== "All" && p.grade   !== grade)   return false;
    if (year    !== "All" && String(p.year) !== year) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasFilters = subject !== "All" || grade !== "All" || year !== "All" || !!search;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Past Papers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a paper for a guided or free practice session.
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
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-[box-shadow] duration-150"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5">
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

        {hasFilters && (
          <Button
            variant="ghost"
            className="text-xs px-3 py-1.5 h-auto text-muted-foreground"
            onClick={() => { setSubject("All"); setGrade("All"); setYear("All"); setSearch(""); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <PaperSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 mb-4">
            <HugeiconsIcon icon={BookOpen01Icon} className="h-5 w-5 text-primary/40" />
          </div>
          <p className="text-sm font-medium">
            {papers.length === 0 ? "No papers yet" : "No matches"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {papers.length === 0
              ? "Papers are added regularly — check back soon."
              : search.trim()
              ? `Nothing found for "${search}".`
              : "Clear your filters to see all papers."}
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSubject("All"); setGrade("All"); setYear("All"); setSearch(""); }}
              className="mt-4 text-xs text-primary hover:underline transition-colors duration-100"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="animate-fade-up">
          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length} paper{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} href={`/papers/${p.id}`} className="group block">
                <Card className="rounded-xl transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5 group-hover:shadow-md group-active:scale-[0.98] group-active:shadow-none">
                  <CardContent className="py-4">
                    <div className="mb-3 flex items-start gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon icon={TaskDaily01Icon} className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{p.title}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="text-xs">{p.subject}</Badge>
                      <Badge variant="outline" className="text-xs">{p.grade}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Calendar01Icon} className="h-3 w-3" />
                        {p.year}
                      </div>
                      <span className={cn(
                        "flex items-center gap-0.5 text-xs font-medium text-primary",
                        "opacity-0 translate-x-0 transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
                        "group-hover:opacity-100 group-hover:translate-x-0.5",
                      )}>
                        Study <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
