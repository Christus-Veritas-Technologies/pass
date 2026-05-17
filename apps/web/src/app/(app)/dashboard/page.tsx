import {
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  FireIcon,
  TaskDaily01Icon,
  ChartIncreaseIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Badge } from "@pass/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@pass/ui/components/card";
import { Progress } from "@pass/ui/components/progress";

// Mock data — mirrors what the API will return
const STATS = {
  papersAttempted: 12,
  questionsAnswered: 148,
  currentStreak: 5,
  weeklyGoal: 20,
  weeklyProgress: 14,
};

const RECENT_SESSIONS = [
  {
    id: "session_1",
    paperTitle: "Mathematics Paper 1 2023",
    subject: "Mathematics",
    score: 75,
    questionsTotal: 20,
    completedAt: "2 days ago",
  },
  {
    id: "session_2",
    paperTitle: "English Language Paper 2 2022",
    subject: "English Language",
    score: 60,
    questionsTotal: 15,
    completedAt: "4 days ago",
  },
  {
    id: "session_3",
    paperTitle: "Combined Science Paper 1 2023",
    subject: "Combined Science",
    score: 88,
    questionsTotal: 25,
    completedAt: "6 days ago",
  },
];

const FEATURED_RESOURCES = [
  {
    id: "res_1",
    title: "Mathematics Revision Notes",
    subject: "Mathematics",
    type: "notes",
  },
  {
    id: "res_2",
    title: "English Essay Writing Guide",
    subject: "English Language",
    type: "guide",
  },
  {
    id: "res_3",
    title: "Chemistry Periodic Table Flashcards",
    subject: "Chemistry",
    type: "flashcards",
  },
];

function scoreColor(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back — keep the streak going.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={TaskDaily01Icon} className="h-4 w-4" />
              <span className="text-xs font-medium">Papers</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{STATS.papersAttempted}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" />
              <span className="text-xs font-medium">Questions</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{STATS.questionsAnswered}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={FireIcon} className="h-4 w-4" />
              <span className="text-xs font-medium">Streak</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{STATS.currentStreak} days</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon icon={ChartIncreaseIcon} className="h-4 w-4" />
              <span className="text-xs font-medium">Weekly goal</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {STATS.weeklyProgress}
              <span className="text-sm font-normal text-muted-foreground">/{STATS.weeklyGoal}</span>
            </p>
            <Progress
              value={STATS.weeklyProgress}
              max={STATS.weeklyGoal}
              className="mt-2 h-1.5"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent papers */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent papers</h2>
          <Link href="/papers" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {RECENT_SESSIONS.map((s) => (
            <Card key={s.id} className="rounded-xl">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.paperTitle}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.subject} · {s.questionsTotal} questions · {s.completedAt}
                    </p>
                  </div>
                  <Badge variant={scoreColor(s.score)}>{s.score}%</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured resources */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Featured resources</h2>
          <Link href="/resources" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {FEATURED_RESOURCES.map((r) => (
            <Card key={r.id} className="rounded-xl">
              <CardContent className="py-4">
                <div className="mb-2 flex items-center gap-2">
                  <HugeiconsIcon icon={BookOpen01Icon} className="h-4 w-4 shrink-0 text-primary" />
                  <Badge variant="outline" className="capitalize">
                    {r.type}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-snug">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.subject}</p>
              </CardContent>
            </Card>
          ))}
        </div>
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
