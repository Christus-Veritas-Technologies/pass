"use client";

import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Edit01Icon,
  Logout01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@pass/ui/components/card";
import { Skeleton } from "@pass/ui/components/skeleton";
import { apiUpdateProfile, clearTokens, getAccessToken } from "@/lib/auth";

const GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];
const PLAN_BADGE: Record<string, "default" | "success" | "warning"> = {
  FREE: "default",
  STUDY: "warning",
  PASS: "success",
};

const API = process.env.NEXT_PUBLIC_SERVER_URL;

interface UserProfile {
  id: string;
  email: string;
  name: string;
  grade: string | null;
  school: string | null;
  plan: string;
}

interface Stats {
  papersAttempted: number;
  questionsAnswered: number;
  currentStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]   = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [name, setName]     = useState("");
  const [grade, setGrade]   = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    fetch(`${API}/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setStats(d.stats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    if (!user) return;
    setName(user.name);
    setGrade(user.grade ?? "");
    setSchool(user.school ?? "");
    setSaveOk(false);
    setSaveErr("");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    setSaveOk(false);
    try {
      const res = await apiUpdateProfile({
        name: name.trim() || undefined,
        grade: grade || undefined,
        school: school.trim() || undefined,
      });
      setUser(res.user as UserProfile);
      setSaveOk(true);
      setTimeout(() => { setEditing(false); setSaveOk(false); }, 1000);
    } catch (err: unknown) {
      setSaveErr((err as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-40 rounded" />
        <Card className="rounded-xl">
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <HugeiconsIcon icon={Edit01Icon} className="mr-2 h-3.5 w-3.5" />
            Edit profile
          </Button>
        )}
      </div>

      {/* Profile card */}
      <Card className="rounded-xl">
        <CardContent className="py-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <HugeiconsIcon icon={UserIcon} className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Editing profile</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">School</label>
                  <input
                    type="text"
                    placeholder="Your school name"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {saveErr && <p className="text-xs text-destructive">{saveErr}</p>}
              {saveOk && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3.5 w-3.5" />
                  Saved!
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  <HugeiconsIcon icon={Cancel01Icon} className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={UserIcon} className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-semibold">{user?.name ?? "—"}</p>
                  <Badge variant={PLAN_BADGE[user?.plan ?? "FREE"] ?? "default"}>
                    {user?.plan ?? "FREE"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.grade && <p className="text-sm text-muted-foreground">{user.grade}</p>}
                {user?.school && <p className="text-sm text-muted-foreground">{user.school}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && !editing && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold">Your stats</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Papers attempted", value: stats.papersAttempted },
                { label: "Questions answered", value: stats.questionsAnswered },
                { label: "Day streak", value: stats.currentStreak },
                { label: "Weekly progress", value: `${stats.weeklyProgress}/${stats.weeklyGoal}` },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan */}
      {!editing && (
        <Card className="rounded-xl">
          <CardContent className="py-5 px-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user?.plan === "FREE"
                  ? "Upgrade for unlimited access to papers and projects."
                  : "You have premium access. Thank you for supporting Pass!"}
              </p>
            </div>
            {user?.plan === "FREE" && (
              <a href="/pricing">
                <Button size="sm">Upgrade</Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      {!editing && (
        <div className="pt-2">
          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleLogout}>
            <HugeiconsIcon icon={Logout01Icon} className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
