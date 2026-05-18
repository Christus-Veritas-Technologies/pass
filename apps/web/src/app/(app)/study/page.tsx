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
import { Button, buttonVariants } from "@pass/ui/components/button";
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
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <Card className="rounded-xl transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-sm animate-fade-up stagger-1">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <HugeiconsIcon icon={TaskDaily01Icon} className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Papers done</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{data?.sessionsCompleted ?? 0}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                of {data?.sessionsStarted ?? 0} started
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-sm animate-fade-up stagger-2">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <HugeiconsIcon icon={TrendingUpDownIcon} className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Completion rate</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{data?.passRate ?? 0}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">sessions finished</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl col-span-2 sm:col-span-1 transition-[transform,box-shadow] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-sm animate-fade-up stagger-3">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Questions answered</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{data?.totalQuestionsAnswered ?? 0}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">across all sessions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent sessions table */}
      <div>
        <h2 className="text-base font-semibold mb-4">Recent sessions</h2>
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
        ) : !data?.sessions.length ? (
          <Card className="rounded-xl">
            <CardContent className="py-16 flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={GraduationScrollIcon} className="h-7 w-7 text-primary/40" />
              </div>
              <div>
                <p className="text-sm font-medium">No sessions yet</p>
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
                <TableRow>
                  <TableHead>Paper</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Questions</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer transition-colors duration-100 active:bg-muted/80"
                    onClick={() => router.push(`/papers/${s.paperId}`)}
                  >
                    <TableCell className="font-medium max-w-[240px]">
                      <span className="line-clamp-1">{s.paperTitle}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.subject}</TableCell>
                    <TableCell>
                      <Badge variant={s.mode === "GUIDE" ? "default" : "outline"} className="text-xs">
                        {s.mode === "GUIDE" ? "Guide" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{s.questionsAnswered}</TableCell>
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
