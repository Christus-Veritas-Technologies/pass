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
import { Button } from "@pass/ui/components/button";
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
  return `${days} days ago`;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [resources, setResources] = useState<FeaturedResource[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

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
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {userName ? `Hi, ${userName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back — keep the streak going.</p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="rounded-xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={TaskDaily01Icon} className="h-4 w-4" />
                <span className="text-xs font-medium">Papers</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats?.papersAttempted ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
                <span className="text-xs font-medium">Questions</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats?.questionsAnswered ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={FireIcon} className="h-4 w-4" />
                <span className="text-xs font-medium">Streak</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats?.currentStreak ?? 0} days</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={ChartIncreaseIcon} className="h-4 w-4" />
                <span className="text-xs font-medium">Weekly goal</span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {stats?.weeklyProgress ?? 0}
                <span className="text-sm font-normal text-muted-foreground">/{stats?.weeklyGoal ?? 5}</span>
              </p>
              <Progress
                value={stats?.weeklyProgress ?? 0}
                max={stats?.weeklyGoal ?? 5}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent papers */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent papers</h2>
          <Link href="/papers" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-10 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={TaskDaily01Icon} className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No papers attempted yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Start a practice session to track your progress.</p>
              </div>
              <Button asChild size="sm" className="mt-1">
                <Link href="/papers">Browse papers</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 5).map((s) => (
              <Card key={s.id} className="rounded-xl">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.paperTitle}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.subject} · {timeAgo(s.completedAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{s.questionsAnswered}q</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Featured resources */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Featured resources</h2>
          <Link href="/resources" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="py-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-10 flex flex-col items-center text-center gap-2">
              <HugeiconsIcon icon={BookOpen01Icon} className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No resources available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {resources.map((r) => (
              <Card key={r.id} className="rounded-xl">
                <CardContent className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <HugeiconsIcon icon={BookOpen01Icon} className="h-4 w-4 shrink-0 text-primary" />
                    <Badge variant="outline" className="capitalize text-xs">{r.type}</Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.subject}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-base font-semibold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { label: "Start a paper", href: "/papers" as const, icon: TaskDaily01Icon },
              { label: "Browse resources", href: "/resources" as const, icon: BookOpen01Icon },
              { label: "View projects", href: "/projects" as const, icon: ChartIncreaseIcon },
              { label: "My profile", href: "/profile" as const, icon: CheckmarkCircle01Icon },
            ] as const
          ).map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={icon} className="h-5 w-5 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
