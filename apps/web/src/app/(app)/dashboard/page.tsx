"use client";

import {
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  FireIcon,
  TaskDaily01Icon,
  ChartIncreaseIcon,
  SparklesIcon,
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

const STAT_CARDS = [
  {
    icon: TaskDaily01Icon,
    label: "Papers done",
    color: "text-violet-600",
    bg: "bg-violet-50",
    key: "papersAttempted" as const,
    suffix: "",
  },
  {
    icon: CheckmarkCircle01Icon,
    label: "Questions answered",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    key: "questionsAnswered" as const,
    suffix: "",
  },
  {
    icon: FireIcon,
    label: "Day streak",
    color: "text-orange-500",
    bg: "bg-orange-50",
    key: "currentStreak" as const,
    suffix: "d",
  },
];

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="pt-5 space-y-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
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
      <div className="rounded-2xl bg-gradient-to-br from-primary to-violet-600 px-6 py-7 text-white">
        <p className="text-sm font-medium text-white/70 mb-1">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {userName ? `Hi, ${userName} 👋` : "Dashboard"}
        </h1>
        <p className="mt-1.5 text-sm text-white/70">Keep the streak going — every session counts.</p>
        <div className="mt-5 flex gap-2.5">
          <Link href="/study/new" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 text-sm font-semibold text-white">
            <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4" />
            Study a paper
          </Link>
          <Link href="/papers" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-sm font-medium text-white/90">
            Browse papers
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_CARDS.map(({ icon, label, color, bg, key, suffix }, i) => (
            <Card key={label} className={`rounded-xl border-border animate-fade-up stagger-${i + 1} transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm`}>
              <CardContent className="pt-4 pb-4">
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <HugeiconsIcon icon={icon} className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {stats?.[key] ?? 0}{suffix}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}

          {/* Weekly goal card */}
          <Card className="rounded-xl border-border col-span-2 sm:col-span-1 animate-fade-up stagger-4 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <HugeiconsIcon icon={ChartIncreaseIcon} className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {stats?.weeklyProgress ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-0.5">/{stats?.weeklyGoal ?? 5}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground mb-2">Weekly goal</p>
              <Progress value={stats?.weeklyProgress ?? 0} max={stats?.weeklyGoal ?? 5} className="h-1.5" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent papers */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent papers</h2>
          <Link href="/papers" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                <HugeiconsIcon icon={TaskDaily01Icon} className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">No papers yet</p>
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
                className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                  <HugeiconsIcon icon={TaskDaily01Icon} className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.paperTitle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.subject} · {timeAgo(s.completedAt)}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">{s.questionsAnswered}q</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Featured resources */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Featured resources</h2>
          <Link href="/resources" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
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
              <Card key={r.id} className="rounded-xl transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-sm cursor-default">
                <CardContent className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                      <HugeiconsIcon icon={BookOpen01Icon} className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">{r.type.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.subject}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(
            [
              { label: "Study a paper", href: "/study/new" as const, icon: TaskDaily01Icon, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Browse resources", href: "/resources" as const, icon: BookOpen01Icon, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "View projects", href: "/projects" as const, icon: ChartIncreaseIcon, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "My profile", href: "/profile" as const, icon: CheckmarkCircle01Icon, color: "text-orange-500", bg: "bg-orange-50" },
            ] as const
          ).map(({ label, href, icon, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center text-xs font-medium text-muted-foreground transition-[transform,background-color,box-shadow] duration-150 hover:bg-muted/50 hover:text-foreground hover:shadow-sm active:scale-[0.97]"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                <HugeiconsIcon icon={icon} className={`h-4.5 w-4.5 ${color}`} />
              </div>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
