"use client";

import {
  CheckmarkCircle01Icon,
  GraduationScrollIcon,
  PlusSignIcon,
  TaskDaily01Icon,
  TrendingUpDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { buttonVariants } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pass/ui/components/table";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface StudyStats {
  sessionsCompleted: number;
  sessionsStarted: number;
  passRate: number;
  totalQuestionsAnswered: number;
  sessions: Session[];
}

interface Session {
  id: string;
  paperId: string;
  paperTitle: string;
  subject: string;
  grade: string;
  mode: "GUIDE" | "FREE";
  questionsAnswered: number;
  completedAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="pt-5 space-y-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const STAT_CARDS = [
  {
    icon: TaskDaily01Icon,
    label: "Papers done",
    subLabel: (d: StudyStats) => `of ${d.sessionsStarted} started`,
    value: (d: StudyStats) => d.sessionsCompleted,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    icon: TrendingUpDownIcon,
    label: "Completion rate",
    subLabel: () => "sessions finished",
    value: (d: StudyStats) => `${d.passRate}%`,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    icon: CheckmarkCircle01Icon,
    label: "Questions answered",
    subLabel: () => "across all sessions",
    value: (d: StudyStats) => d.totalQuestionsAnswered,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
];

export default function StudyPage() {
  const router = useRouter();
  const [data, setData] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API}/study/stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setData(d?.sessions !== undefined ? d : null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your progress and start new practice sessions.
          </p>
        </div>
        <Link href="/study/new" className={buttonVariants()}>
          <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
          Study new paper
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {STAT_CARDS.map(({ icon, label, subLabel, value, iconColor, iconBg }, i) => (
            <Card key={label} className={`rounded-xl transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm animate-fade-up stagger-${i + 1} ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <CardContent className="pt-5 pb-4">
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
                  <HugeiconsIcon icon={icon} className={`h-4 w-4 ${iconColor}`} />
                </div>
                <p className="text-2xl font-bold tracking-tight">{data ? value(data) : 0}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                {data && (
                  <p className="mt-0.5 text-xs text-muted-foreground/70">{subLabel(data)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent sessions table */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
            <HugeiconsIcon icon={GraduationScrollIcon} className="h-3 w-3 text-primary" />
          </span>
          Recent sessions
        </h2>
        {loading ? (
          <Card className="rounded-xl">
            <CardContent className="py-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : !data?.sessions?.length ? (
          <Card className="rounded-xl">
            <CardContent className="py-16 flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50">
                <HugeiconsIcon icon={GraduationScrollIcon} className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">No sessions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start your first practice session to track your progress.
                </p>
              </div>
              <Link href="/study/new" className={buttonVariants({ size: "sm" })}>Study new paper</Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-foreground">Paper</TableHead>
                  <TableHead className="font-semibold text-foreground">Subject</TableHead>
                  <TableHead className="font-semibold text-foreground">Mode</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Questions</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer transition-colors duration-100 hover:bg-muted/40"
                    onClick={() => router.push(`/papers/${s.paperId}`)}
                  >
                    <TableCell className="font-medium max-w-[240px]">
                      <span className="line-clamp-1">{s.paperTitle}</span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{s.subject}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.mode === "GUIDE" ? "default" : "outline"}
                        className={`text-xs ${s.mode === "GUIDE" ? "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100" : ""}`}
                      >
                        {s.mode === "GUIDE" ? "Guide" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{s.questionsAnswered}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {timeAgo(s.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
