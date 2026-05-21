"use client";

import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  CrownIcon,
  Edit01Icon,
  Logout01Icon,
  User02Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  SmartPhone01Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@pass/ui/components/badge";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@pass/ui/components/card";
import { Progress } from "@pass/ui/components/progress";
import { Skeleton } from "@pass/ui/components/skeleton";
import { apiUpdateProfile, clearTokens, getAccessToken } from "@/lib/auth";

const GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];
const PLAN_BADGE: Record<string, "default" | "success" | "warning"> = {
  FREE: "default",
  STUDY: "warning",
  PASS: "success",
};
const PLAN_LABEL: Record<string, string> = { FREE: "Free plan", STUDY: "Study plan", PASS: "Pass plan" };

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

interface PlanUsage {
  papers:   { used: number; limit: number };
  projects: { used: number; limit: number };
}

interface SubscriptionInfo {
  plan: string;
  status: string;
  expiryDate: string;
  daysRemaining: number;
  renewalDue: boolean;
}

interface WhatsAppStatus {
  linked: boolean;
  phone?: string;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]         = useState<UserProfile | null>(null);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing] = useState(false);

  const [name, setName]     = useState("");
  const [grade, setGrade]   = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<Date | null>(null);
  const [linkExpirySecs, setLinkExpirySecs] = useState(0);
  const [linkLoading, setLinkLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const token = getAccessToken();

    // Fetch user profile and stats
    fetch(`${API}/users/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setStats(d.stats ?? null);
        setPlanUsage(d.planUsage ?? null);
        setWhatsapp(d.whatsapp ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch subscription info if user has paid plan
    if (token) {
      fetch(`${API}/payments/renewal-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) {
            setSubscription(d);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!linkExpiry) return;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.round((linkExpiry.getTime() - Date.now()) / 1000));
      setLinkExpirySecs(secs);
      if (secs === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [linkExpiry]);

  async function handleConnectWhatsApp() {
    setLinkLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/users/me/whatsapp/link-code`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setLinkCode(data.code);
      const expiry = new Date(data.expiresAt);
      setLinkExpiry(expiry);
      setLinkExpirySecs(Math.max(0, Math.round((expiry.getTime() - Date.now()) / 1000)));
    } catch {
      // silently ignore
    } finally {
      setLinkLoading(false);
    }
  }

  async function handleDisconnectWhatsApp() {
    setDisconnecting(true);
    try {
      const token = getAccessToken();
      await fetch(`${API}/users/me/whatsapp`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setWhatsapp(null);
      setLinkCode(null);
      setLinkExpiry(null);
    } catch {
      // silently ignore
    } finally {
      setDisconnecting(false);
    }
  }

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
        <Card className="rounded-2xl overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-primary to-violet-600" />
          <CardContent className="px-6 pb-6">
            <div className="-mt-10 mb-4">
              <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
            </div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-52" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = user?.name ? getInitials(user.name) : "?";

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-up">

      {/* Profile hero card */}
      <Card className="rounded-2xl overflow-hidden">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-primary to-violet-600 relative">
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startEdit}
              className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/20 h-8 px-3 text-xs font-medium"
            >
              <HugeiconsIcon icon={Edit01Icon} className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        <CardContent className="px-6 pb-6">
          {/* Avatar overlap */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-primary text-white text-2xl font-bold">
              {initials !== "?" ? (
                initials
              ) : (
                <HugeiconsIcon icon={User02Icon} className="h-9 w-9 text-white" />
              )}
            </div>
            <Badge variant={PLAN_BADGE[user?.plan ?? "FREE"] ?? "default"} className="mb-1">
              {user?.plan !== "FREE" && <HugeiconsIcon icon={CrownIcon} className="mr-1 h-3 w-3" />}
              {PLAN_LABEL[user?.plan ?? "FREE"] ?? "Free plan"}
            </Badge>
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</label>
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">School</label>
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
                  Changes saved!
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
            <div>
              <h2 className="text-xl font-bold text-foreground">{user?.name ?? "—"}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {user?.grade && (
                  <span className="inline-flex items-center rounded-md bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                    {user.grade}
                  </span>
                )}
                {user?.school && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {user.school}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && !editing && (
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold">Your progress</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Papers done", value: stats.papersAttempted, color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Questions", value: stats.questionsAnswered, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Day streak", value: `${stats.currentStreak}d`, color: "text-orange-500", bg: "bg-orange-50" },
                { label: `Weekly (${stats.weeklyGoal} goal)`, value: stats.weeklyProgress, color: "text-blue-600", bg: "bg-blue-50" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl ${bg} px-3 py-3`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Status */}
      {!editing && subscription && (user?.plan === "STUDY" || user?.plan === "PASS") && (
        <Card className={`rounded-xl ${subscription.renewalDue ? "border-amber-200 bg-amber-50/30" : ""}`}>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${subscription.renewalDue ? "bg-amber-100" : "bg-emerald-50"}`}>
                  <HugeiconsIcon
                    icon={subscription.renewalDue ? AlertCircleIcon : CrownIcon}
                    className={`h-4 w-4 ${subscription.renewalDue ? "text-amber-600" : "text-emerald-600"}`}
                  />
                </div>
                <CardTitle className="text-sm font-semibold">Your subscription</CardTitle>
              </div>
              <Badge
                variant={subscription.renewalDue ? "warning" : "success"}
                className="text-xs"
              >
                {subscription.status === "ACTIVE" ? "Active" : "Expired"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Expires on</p>
                  <p className="font-semibold">
                    {new Date(subscription.expiryDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Days remaining</p>
                  <p className={`text-lg font-bold ${subscription.renewalDue ? "text-amber-600" : "text-primary"}`}>
                    {subscription.daysRemaining}d
                  </p>
                </div>
              </div>
            </div>

            {subscription.renewalDue && (
              <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2">
                <p className="text-xs text-amber-900 font-medium">
                  Your subscription is expiring soon! Renew now to keep access.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => router.push(`/checkout?plan=${subscription.plan}`)}
                className="flex-1 h-9"
              >
                {subscription.renewalDue ? "Renew now" : "Manage"}
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan & Usage */}
      {!editing && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <HugeiconsIcon icon={CrownIcon} className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="text-sm font-semibold">Plan &amp; Usage</CardTitle>
              </div>
              <Badge variant={PLAN_BADGE[user?.plan ?? "FREE"] ?? "default"} className="text-xs">
                {PLAN_LABEL[user?.plan ?? "FREE"] ?? "Free plan"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {planUsage ? (
              <>
                {[
                  { label: "Papers this month",      key: "papers"   as const, color: "bg-primary" },
                  { label: "AI Projects this month", key: "projects" as const, color: "bg-violet-500" },
                ].map(({ label, key, color }) => {
                  const { used, limit } = planUsage[key];
                  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                  const almostFull = pct >= 80;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-semibold tabular-nums ${almostFull ? "text-destructive" : "text-foreground"}`}>
                          {used} / {limit}
                        </span>
                      </div>
                      <Progress
                        value={used}
                        max={limit}
                        className={`h-1.5 ${almostFull ? "[&>div]:bg-destructive" : `[&>div]:${color}`}`}
                      />
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Usage data unavailable</p>
            )}
            {user?.plan === "FREE" && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between gap-4">
                <p className="text-xs text-amber-800 leading-relaxed">
                  Upgrade to <strong>Study</strong> or <strong>Pass</strong> for more papers and projects each month.
                </p>
                <a href="/pricing">
                  <Button size="sm" className="shrink-0 h-7 text-xs">Upgrade</Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connect WhatsApp */}
      {!editing && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${whatsapp?.linked ? "bg-emerald-50" : "bg-blue-50"}`}>
                  <HugeiconsIcon icon={SmartPhone01Icon} className={`h-4 w-4 ${whatsapp?.linked ? "text-emerald-600" : "text-blue-500"}`} />
                </div>
                <CardTitle className="text-sm font-semibold">WhatsApp</CardTitle>
              </div>
              {whatsapp?.linked && (
                <Badge variant="success" className="text-xs">Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {whatsapp?.linked ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connected as <span className="font-medium text-foreground">{whatsapp.phone}</span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive h-8 text-xs"
                  onClick={handleDisconnectWhatsApp}
                  disabled={disconnecting}
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ) : linkCode ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Send this code to the WhatsApp bot to link your account:
                </p>
                <div className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between">
                  <span className="text-2xl font-bold tracking-widest text-foreground font-mono">{linkCode}</span>
                  <span className="text-xs text-muted-foreground">
                    {linkExpirySecs > 0 ? `${linkExpirySecs}s` : "Expired"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConnectWhatsApp}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                  disabled={linkLoading}
                >
                  <HugeiconsIcon icon={LinkSquare02Icon} className="h-3 w-3" />
                  Regenerate
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Link your WhatsApp number to study, generate projects, and ask questions via chat.
                </p>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleConnectWhatsApp}
                  disabled={linkLoading}
                >
                  <HugeiconsIcon icon={LinkSquare02Icon} className="mr-1.5 h-3.5 w-3.5" />
                  {linkLoading ? "Generating…" : "Connect WhatsApp"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      {!editing && (
        <div className="pt-1">
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            onClick={handleLogout}
          >
            <HugeiconsIcon icon={Logout01Icon} className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
