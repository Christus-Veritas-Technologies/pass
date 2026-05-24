"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { clearTokens, getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { FormattedQuestionText } from "@/lib/format-question";
import { MarkdownContent } from "@/lib/render-markdown";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface Attempt {
  id: string;
  questionNumber: number;
  questionText: string;
  userAnswer: string | null;
  explanation: string | null;
}

interface SessionDetail {
  id: string;
  mode: "GUIDE" | "FREE";
  questionsAnswered: number;
  completedAt: string | null;
  paper: {
    id: string;
    title: string;
    subject: string;
    grade: string;
    year: number;
  };
  attempts: Attempt[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function AttemptCard({ attempt, mode }: { attempt: Attempt; mode: "GUIDE" | "FREE" }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {attempt.questionNumber}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium line-clamp-2 text-foreground">
            {attempt.questionText}
          </p>
        </div>
        <HugeiconsIcon
          icon={open ? ArrowUp01Icon : ArrowDown01Icon}
          className="h-4 w-4 shrink-0 text-muted-foreground"
        />
      </button>

      {open && (
        <CardContent className="pb-5 pt-0 space-y-4 border-t border-border">
          {/* Full question text */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Question</p>
            <FormattedQuestionText text={attempt.questionText} />
          </div>

          {/* User's answer (Guide mode only) */}
          {mode === "GUIDE" && attempt.userAnswer && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Your answer</p>
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                {attempt.userAnswer}
              </div>
            </div>
          )}

          {/* AI explanation / solution */}
          {attempt.explanation ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HugeiconsIcon icon={SparklesIcon} className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-primary">
                  AI {mode === "GUIDE" ? "Feedback" : "Solution"}
                </p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <MarkdownContent text={attempt.explanation} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No AI response recorded for this question.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SessionReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API}/papers/sessions/${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (r.status === 401) { clearTokens(); router.replace("/login"); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.error) throw new Error(d.error);
        setSession(d.session);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center space-y-4">
        <p className="text-sm text-muted-foreground">{error ?? "Session not found."}</p>
        <Link href="/study" className="inline-block text-sm text-primary hover:underline">Back to Study</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/study"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{session.paper.title}</h1>
          <p className="text-xs text-muted-foreground">
            {session.paper.subject} · {session.paper.grade} · {session.paper.year}
          </p>
        </div>
      </div>

      {/* Session summary card */}
      <Card className="rounded-xl">
        <CardContent className="py-5 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{session.questionsAnswered}</p>
              <p className="text-xs text-muted-foreground">questions answered</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block" />
          <Badge
            variant={session.mode === "GUIDE" ? "default" : "outline"}
            className={`text-xs ${session.mode === "GUIDE" ? "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100" : ""}`}
          >
            {session.mode === "GUIDE" ? "Guide mode" : "Free mode"}
          </Badge>
          {session.completedAt && (
            <>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <p className="text-xs text-muted-foreground">{timeAgo(session.completedAt)}</p>
            </>
          )}
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => router.push(`/papers/${session.paper.id}`)}
            >
              Study again
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attempts list */}
      {session.attempts.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No question attempts recorded for this session.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {session.attempts.length} question{session.attempts.length !== 1 ? "s" : ""}
          </h2>
          {session.attempts.map((a) => (
            <AttemptCard key={a.id} attempt={a} mode={session.mode} />
          ))}
        </div>
      )}
    </div>
  );
}
