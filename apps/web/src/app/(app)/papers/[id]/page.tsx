"use client";

import {
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  File01Icon,
  Image01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Progress } from "@pass/ui/components/progress";
import { Skeleton } from "@pass/ui/components/skeleton";
import { cn } from "@/lib/utils";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { FormattedQuestionText } from "@/lib/format-question";
import { MarkdownContent } from "@/lib/render-markdown";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface Question {
  id: string;
  questionNumber: number;
  text: string;
  marks: number;
  section?: string | null;
  topic?: string | null;
  pdfPage?: number | null;
  hasDiagram?: boolean;
  diagramNote?: string | null;
  guideSource?: "AI_GENERATED" | "OFFICIAL";
}

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
  fileUrl?: string;
}

type Mode = "GUIDE" | "FREE";

export default function PaperSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("GUIDE");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [aiResponses, setAiResponses] = useState<Record<number, string>>({});
  const [streaming, setStreaming] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [startError, setStartError] = useState<string | null>(null);

  const pdfUrl = paper?.fileUrl ? `${API}${paper.fileUrl}` : "";
  function openPdf(page = 1) {
    setPdfPage(page);
    setPdfOpen(true);
  }

  const answerRef = useRef<HTMLTextAreaElement>(null);
  const aiBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/papers/${id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setPaper(d.paper);
        setQuestions(d.questions ?? []);
      })
      .catch((err) => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    const token = getAccessToken();
    try {
      const res = await fetch(`${API}/papers/${id}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.status === 401) {
        clearTokens();
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      setSessionId(data.session?.id ?? null);
      setStarted(true);
    } catch (err) {
      setStartError((err as Error).message ?? "Failed to start session. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!sessionId) return;
    const q = questions[currentIndex];
    if (!q) return;
    setStreaming(true);
    setAiResponses((prev) => ({ ...prev, [q.questionNumber]: "" }));

    const token = getAccessToken();
    const body: Record<string, unknown> = {
      questionNumber: q.questionNumber,
      questionText: q.text,
      mode,
    };
    if (mode === "GUIDE") body.userAnswer = answers[q.questionNumber] ?? "";

    try {
      const res = await fetch(`${API}/papers/session/${sessionId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        clearTokens();
        router.replace("/login");
        return;
      }
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const chunk = line.slice(5).trim();
            if (chunk) {
              setAiResponses((prev) => ({
                ...prev,
                [q.questionNumber]: (prev[q.questionNumber] ?? "") + chunk,
              }));
              // Auto-scroll AI box
              if (aiBoxRef.current) {
                aiBoxRef.current.scrollTop = aiBoxRef.current.scrollHeight;
              }
            }
          }
          if (line.startsWith("event: done")) {
            setCompleted((prev) => new Set([...prev, q.questionNumber]));
          }
        }
      }
    } catch (err) {
      setAiResponses((prev) => ({
        ...prev,
        [q.questionNumber]: "Failed to get AI response. Please try again.",
      }));
    } finally {
      setStreaming(false);
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    const token = getAccessToken();
    const res = await fetch(`${API}/papers/session/${sessionId}/complete`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).catch(console.error);
    if (res && res.status === 401) {
      clearTokens();
      router.replace("/login");
      return;
    }
    setSessionComplete(true);
  }

  const currentQ = questions[currentIndex];
  const answeredCount = completed.size;
  const totalQ = questions.length;
  const allDone = answeredCount >= totalQ && totalQ > 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-0">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
        {/* Mobile skeleton: pill row + full-width panel */}
        <div className="mt-6 flex gap-2 lg:hidden overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-10 shrink-0 rounded-full" />
          ))}
        </div>
        {/* Desktop skeleton: sidebar + panel */}
        <div className="hidden lg:grid grid-cols-[180px_1fr] gap-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl lg:hidden" />
      </div>
    );
  }

  if (!loading && !paper) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center">
        <p className="text-sm text-muted-foreground">Paper not found.</p>
        <Link href="/resources" className="mt-4 inline-block text-sm text-primary hover:underline">Browse resources</Link>
      </div>
    );
  }

  if (!paper) return null;

  if (sessionComplete) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center space-y-5">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold">Session complete!</h2>
        <p className="text-sm text-muted-foreground">
          You answered {answeredCount} of {totalQ} questions in {mode === "GUIDE" ? "Guide" : "Free"} mode.
        </p>
        <Link href="/resources" className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Back to resources
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link href="/resources" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold sm:text-lg">{paper.title}</h1>
          <p className="text-xs text-muted-foreground">{paper.subject} · {paper.grade} · {paper.year}</p>
        </div>
        {pdfUrl && (
          <Button variant="outline" size="sm" onClick={() => openPdf(1)} className="gap-1.5 rounded-lg text-xs shrink-0">
            <HugeiconsIcon icon={File01Icon} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Original paper</span>
            <span className="sm:hidden">Paper</span>
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {started && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answeredCount} of {totalQ} questions answered</span>
            <span>{Math.round((answeredCount / totalQ) * 100)}%</span>
          </div>
          <Progress value={answeredCount} max={totalQ} />
        </div>
      )}

      {/* Mode selector — only before start */}
      {!started && (
        <Card className="rounded-xl">
          <CardContent className="py-5 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1">Choose your mode</p>
              <p className="text-xs text-muted-foreground">You cannot change this once you start.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["GUIDE", "FREE"] as const).map((m) => (
                <Button
                  key={m}
                  onClick={() => setMode(m)}
                  variant="outline"
                  className={cn(
                    "h-auto rounded-xl border-2 p-4 flex-col items-start",
                    mode === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-semibold">{m === "GUIDE" ? "Guide" : "Free"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m === "GUIDE"
                      ? "Write your answer and get AI feedback on how you did."
                      : "Skip the attempt — see the full worked solution immediately."}
                  </p>
                </Button>
              ))}
            </div>
            <Button
              onClick={handleStart}
              disabled={starting}
              className="w-full rounded-xl"
            >
              {starting ? "Starting…" : "Start session"}
            </Button>
            {startError && (
              <p className="text-xs text-destructive">{startError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main session UI */}
      {started && currentQ && (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[180px_1fr] lg:gap-5">

          {/* ── Mobile: horizontal pill navigator ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {questions.map((q, i) => {
              const isDone = completed.has(q.questionNumber);
              const isActive = i === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isDone && !isActive && "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    !isActive && !isDone && "border-border bg-background text-muted-foreground hover:border-primary/40",
                  )}
                  aria-label={`Question ${q.questionNumber}`}
                >
                  {isDone && !isActive
                    ? <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
                    : q.questionNumber}
                </button>
              );
            })}
          </div>

          {/* ── Desktop: vertical sidebar navigator ── */}
          <div className="hidden lg:block space-y-1.5">
            {questions.map((q, i) => {
              const isDone = completed.has(q.questionNumber);
              const isActive = i === currentIndex;
              return (
                <Button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-sm",
                    isActive && "bg-primary/10 text-primary font-medium",
                    isDone && !isActive && "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
                    !isActive && !isDone && "text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4 shrink-0" />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                      {q.questionNumber}
                    </span>
                  )}
                  <span className="truncate">Q{q.questionNumber}</span>
                  <span className="ml-auto shrink-0 text-[10px] opacity-60">{q.marks}m</span>
                </Button>
              );
            })}
          </div>

          {/* Question panel */}
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardContent className="py-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Question {currentQ.questionNumber} · {currentQ.marks} mark{currentQ.marks !== 1 ? "s" : ""}
                  </span>
                  <Badge variant="outline">{mode === "GUIDE" ? "Guide" : "Free"}</Badge>
                </div>
                <FormattedQuestionText text={currentQ.text} />

                {/* Diagram-dependent question — link to the original PDF page */}
                {currentQ.hasDiagram && (
                  <button
                    type="button"
                    onClick={() => openPdf(currentQ.pdfPage ?? 1)}
                    className="mt-3 flex w-full items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-left text-xs text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    <HugeiconsIcon icon={Image01Icon} className="h-4 w-4 shrink-0" />
                    <span>
                      {currentQ.diagramNote
                        ? `Refers to a figure: ${currentQ.diagramNote}. Click to view the original paper.`
                        : "This question refers to a figure. Click to view the original paper."}
                    </span>
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Guide: answer textarea */}
            {mode === "GUIDE" && !completed.has(currentQ.questionNumber) && (
              <div className="space-y-2">
                <textarea
                  ref={answerRef}
                  placeholder="Write your answer here…"
                  value={answers[currentQ.questionNumber] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [currentQ.questionNumber]: e.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent resize-none"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={streaming || !answers[currentQ.questionNumber]?.trim()}
                  className="rounded-xl gap-2"
                >
                  <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                  {streaming ? "Getting feedback…" : "Submit Answer"}
                </Button>
              </div>
            )}

            {/* Free: get answer button */}
            {mode === "FREE" && !completed.has(currentQ.questionNumber) && (
              <Button
                onClick={handleSubmit}
                disabled={streaming}
                className="rounded-xl gap-2"
              >
                <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                {streaming ? "Loading answer…" : "Get Answer"}
              </Button>
            )}

            {/* AI response */}
            {(aiResponses[currentQ.questionNumber] || streaming) && (
              <Card className="rounded-xl border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3 text-primary">
                    <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
                    <span className="text-xs font-semibold">AI {mode === "GUIDE" ? "Feedback" : "Solution"}</span>
                    {mode === "GUIDE" && (
                      <span
                        className={cn(
                          "ml-auto text-[10px] font-medium",
                          currentQ.guideSource === "OFFICIAL"
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {currentQ.guideSource === "OFFICIAL"
                          ? "Official marking scheme"
                          : "AI-estimated marking"}
                      </span>