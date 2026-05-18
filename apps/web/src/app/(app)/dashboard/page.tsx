"use client";

import {
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  FireIcon,
  TaskDaily01Icon,
  ChartIncreaseIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { buttonVariants } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { Progress } from "@pass/ui/components/progress";
import { Skeleton } from "@pass/ui/components/skeleton";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface Stats {
  papersAttempted: number;
  questionsAnswered: number;
  currentStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

interface RecentSession {
  id: string;
  paperId: string;
  paperTitle: string;
  subject: string;
  questionsAnswered: number;
  completedAt: string;
}

interface FeaturedResource {
  id: string;
  title: string;
  subject: string;
  type: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="pt-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const STAT_STAGGER = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [resources, setResources] = useState<FeaturedResource[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.allSettled([
      fetch(`${API}/users/me`, { headers }),
      fetch(`${API}/papers/sessions/recent`, { headers }),
      fetch(`${API}/resources/featured`),
    ]).then(async ([meRes, sessionsRes, resourcesRes]) => {
      if (meRes.status === "fulfilled" && meRes.value.ok) {
        const data = await meRes.value.json();
        setStats(data.stats);
        setUserName(data.user?.name?.split(" ")[0] ?? "");
      }
      if (sessionsRes.status === "fulfilled" && sessionsRes.value.ok) {
        const data = await sessionsRes.value.json();
        setSessions(data.sessions ?? []);
      }
      if (resourcesRes.status === "fulfilled" && resourcesRes.value.ok) {
        const data = await resourcesRes.value.json();
        setResources(data.resources ?? []);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {userName ? `Hi, ${userName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Keep the streak going.</p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: TaskDaily01Icon, label: "Papers", value: stats?.papersAttempted ?? 0 },
            { icon: CheckmarkCircle01Icon, label: "Questions", value: stats?.questionsAnswered ?? 0 },
            { icon: FireIcon, label: "Streak", value: `${stats?.currentStreak ?? 0}d` },
            { icon: ChartIncreaseIcon, label: "Weekly goal", value: stats?.weeklyProgress ?? 0, goal: stats?.weeklyGoal ?? 5 },
          ].map(({ icon, label, value, goal }, i) => (
            <Card
              key={label}
              className={`rounded-xl transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm animate-fade-up ${STAT_STAGGER[i]}`}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <HugeiconsIcon icon={icon} className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {value}
                  {goal !== undefined && (
                    <span className="text-sm font-normal text-muted-foreground ml-0.5">/{goal}</span>
                  )}
                </p>
                {goal !== undefined && (
                  <Progress value={stats?.weeklyProgress ?? 0} max={goal} className="mt-2 h-1" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent papers */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent papers</h2>
          <Link href="/papers" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-100">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-10 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={TaskDaily01Icon} className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No papers yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Start a session to track progress.</p>
              </div>
              <Link href="/study/new" className={buttonVariants({ size: "sm" }) + " mt-1"}>Study a paper</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {sessions.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                href={`/papers/${s.paperId}`}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-card hover:bg-muted/50 transition-colors duration-100 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.paperTitle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.subject} · {timeAgo(s.completedAt)}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{s.questionsAnswered}q</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Featured resources */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Featured resources</h2>
          <Link href="/resources" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-100">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="py-4 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center gap-2">
            <HugeiconsIcon icon={BookOpen01Icon} className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No resources available yet</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {resources.map((r) => (
              <Card
                key={r.id}
                className="rounded-xl transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm cursor-default"
              >
                <CardContent className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <HugeiconsIcon icon={BookOpen01Icon} className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <Badge variant="outline" className="capitalize text-xs">{r.type.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug line-clamp-2">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.subject}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(
            [
              { label: "Study a paper", href: "/study/new" as const, icon: TaskDaily01Icon },
              { label: "Browse resources", href: "/resources" as const, icon: BookOpen01Icon },
              { label: "View projects", href: "/projects" as const, icon: ChartIncreaseIcon },
              { label: "My profile", href: "/profile" as const, icon: CheckmarkCircle01Icon },
            ] as const
          ).map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center text-xs font-medium text-muted-foreground transition-[transform,background-color,box-shadow] duration-150 hover:bg-muted hover:text-foreground hover:shadow-sm active:scale-[0.97]"
            >
              <HugeiconsIcon icon={icon} className="h-4 w-4 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
