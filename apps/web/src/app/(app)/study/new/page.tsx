"use client";

import {
  ArrowLeft01Icon,
  BookOpen01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Search01Icon,
  SparklesIcon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

const LEVELS = [
  { label: "All Levels", value: "All" },
  { label: "A-Level",    value: "A-Level" },
  { label: "O-Level",    value: "O-Level" },
  { label: "Grade 7",    value: "Grade-7" },
] as const;

const SUBJECTS = [
  "All", "Mathematics", "English Language", "Combined Science",
  "Chemistry", "Biology", "History", "Geography", "Physics", "Accounting",
];

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
}

interface PrepResult {
  paper: Paper;
  brief: string;
}

type Step = "select" | "prepare";

function PaperCardSkeleton() {
  return (
    <Card className="rounded-xl">
      <CardContent className="py-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudyNewPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");

  // Step 1 state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");
  const [subject, setSubject] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Step 2 state
  const [prep, setPrep] = useState<PrepResult | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState("");

  const PAPERS_CACHE_KEY = "pass_papers_cache";
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(PAPERS_CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached) as { data: Paper[]; ts: number };
        if (Date.now() - ts < 5 * 60 * 1000) {
          setPapers(data);
          setLoadingPapers(false);
          return;
        }
      }
    } catch {}
    fetch(`${API}/papers`)
      .then((r) => r.json())
      .then((d) => {
        const list: Paper[] = d.papers ?? [];
        try { sessionStorage.setItem(PAPERS_CACHE_KEY, JSON.stringify({ data: list, ts: Date.now() })); } catch {}
        setPapers(list);
      })
      .catch(() => setPapers([]))
      .finally(() => setLoadingPapers(false));
  }, []);

  const filtered = papers.filter((p) => {
    if (level !== "All" && p.grade !== level) return false;
    if (subject !== "All" && p.subject !== subject) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handlePrepare() {
    if (!selectedId) return;
    setStep("prepare");
    setPreparing(true);
    setPrepError("");

    const token = getAccessToken();
    try {
      const res = await fetch(`${API}/study/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paperId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preparation failed");
      setPrep(data);
    } catch (err: unknown) {
      setPrepError((err as Error).message ?? "Something went wrong");
    } finally {
      setPreparing(false);
    }
  }

  function handleBeginSession() {
    if (!selectedId) return;
    router.push(`/papers/${selectedId}`);
  }

  // ─── Step 1: Paper selector ───────────────────────────────────────────────

  if (step === "select") {
    return (
      <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in-0 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/study"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Choose a paper</h1>
            <p className="text-sm text-muted-foreground">Step 1 of 2 — select the paper you want to study</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">2</div>
        </div>

        {/* Search */}
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search papers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Level tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden w-fit">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-medium transition-colors",
                level === l.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Subject chips */}
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                subject === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Papers grid */}
        {loadingPapers ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <PaperCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={BookOpen01Icon} className="h-5 w-5 text-primary/40" />
            </div>
            <p className="text-sm font-medium">No papers found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or subject filter.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : p.id)}
                  className="text-left w-full"
                >
                  <Card
                    className={cn(
                      "rounded-xl transition-all cursor-pointer hover:shadow-md",
                      isSelected
                        ? "ring-2 ring-primary shadow-md"
                        : "hover:border-primary/30",
                    )}
                  >
                    <CardContent className="py-4">
                      <div className="mb-2 flex items-start gap-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isSelected ? "bg-primary" : "bg-primary/10",
                          )}
                        >
                          {isSelected ? (
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <HugeiconsIcon icon={TaskDaily01Icon} className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm font-medium leading-snug line-clamp-2">{p.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-xs">{p.subject}</Badge>
                        <Badge variant="outline" className="text-xs">{p.grade}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Calendar01Icon} className="h-3 w-3" />
                        {p.year}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}

        {/* Continue button */}
        <div className="sticky bottom-6 flex justify-end">
          <Button
            onClick={handlePrepare}
            disabled={!selectedId}
            size="lg"
            className="rounded-xl shadow-lg"
          >
            <HugeiconsIcon icon={SparklesIcon} className="mr-2 h-4 w-4" />
            Prepare session
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Mastra preparation ───────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg py-12 space-y-8 animate-in fade-in-0 duration-300">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5" />
        </div>
        <div className="h-px flex-1 bg-primary/40" />
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</div>
      </div>

      {preparing ? (
        <div className="flex flex-col items-center text-center gap-6 py-8">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={SparklesIcon} className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold">Preparing your session</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pass AI is reviewing the paper and preparing your study brief…
            </p>
          </div>
        </div>
      ) : prepError ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">{prepError}</p>
          <Button variant="outline" onClick={() => setStep("select")}>Go back</Button>
        </div>
      ) : prep ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Ready to study</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {prep.paper.subject} · {prep.paper.grade} · {prep.paper.year}
            </p>
          </div>

          {/* AI brief */}
          <Card className="rounded-xl border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                <span className="text-xs font-semibold">Pass AI — Study Brief</span>
              </div>
              <p className="text-sm leading-relaxed">{prep.brief}</p>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { setStep("select"); setPrep(null); }}
              className="rounded-xl"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
              Change paper
            </Button>
            <Button onClick={handleBeginSession} className="flex-1 rounded-xl">
              <HugeiconsIcon icon={TaskDaily01Icon} className="mr-2 h-4 w-4" />
              Begin session
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
