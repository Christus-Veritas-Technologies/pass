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
  Copy01Icon,
  Notification01Icon,
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
  phone: string | null;
  linkedAt: string | null;
}

interface ReferralInfo {
  code: string | null;
  bonusPapers: number;
  bonusProjects: number;
}

interface NotificationSettings {
  emailEnabled: boolean;
  webPushEnabled: boolean;
  nativePushEnabled: boolean;
  referralAlerts: boolean;
  loginAlerts: boolean;
  paymentAlerts: boolean;
  renewalAlerts: boolean;
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
  const [whatsapp, setWhatsapp]         = useState<WhatsAppStatus | null>(null);
  const [linkCode, setLinkCode]         = useState<{ code: string; expiresAt: string } | null>(null);
  const [linkLoading, setLinkLoading]   = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing] = useState(false);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);

  const [name, setName]     = useState("");
  const [grade, setGrade]   = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");

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
        if (d.referral) setReferral(d.referral as ReferralInfo);
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

      fetch(`${API}/notifications/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => { if (d && !d.error) setNotifSettings(d as NotificationSettings); })
        .catch(() => {});
    }
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

  async function handleGenerateLinkCode() {
    const token = getAccessToken();
    if (!token) return;
    setLinkLoading(true);
    setLinkCode(null);
    try {
      const res = await fetch(`${API}/users/me/whatsapp/link-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { code: string; expiresAt: string };
      setLinkCode(data);
    } catch { /* ignore */ }
    finally { setLinkLoading(false); }
  }

  async function handleUnlinkWhatsApp() {
    const token = getAccessToken();
    if (!token) return;
    setUnlinkLoading(true);
    try {
      await fetch(`${API}/users/me/whatsapp`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setWhatsapp({ linked: false, phone: null, linkedAt: null });
      setLinkCode(null);
    } catch { /* ignore */ }
    finally { setUnlinkLoading(false); }
  }

  function copyReferralLink() {
    if (!referral?.code) return;
    const url = `${window.location.origin}/signup?ref=${referral.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    }).catch(() => undefined);
  }

  async function patchNotifSettings(patch: Partial<NotificationSettings>) {
    const token = getAccessToken();
    if (!token || !notifSettings) return;
    const updated = { ...notifSettings, ...patch };
    setNotifSettings(updated); // optimistic
    setNotifSaving(true);
    try {
      // When enabling browser push, register the service worker subscription first
      if (patch.webPushEnabled === true) {
        const { initWebPush } = await import("@/lib/webPush");
        const { env } = await import("@pass/env/web");
        if (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          await initWebPush(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY).catch(() => undefined);
        }
      }

      // When disabling browser push, unsubscribe at the browser level
      if (patch.webPushEnabled === false && typeof window !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js").catch(() => null);
        const sub = await reg?.pushManager.getSubscription().catch(() => null);
        if (sub) {
          await fetch(`${API}/notifications/web-push/subscribe`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          }).catch(() => undefined);
          await sub.unsubscribe().catch(() => undefined);
        }
      }

      await fetch(`${API}/notifications/settings`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch { /* ignore */ }
    finally { setNotifSaving(false); }
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
                  <label className="text-sm font-medium text-foreground/90">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/90">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground/90">School</label>
                  <input
                    type="text"
                    placeholder="Your school name"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm hover:border-primary/40 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
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
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <HugeiconsIcon icon={SmartPhone01Icon} className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-semibold">WhatsApp</CardTitle>
              {whatsapp?.linked && (
                <Badge variant="success" className="text-xs ml-auto">Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {whatsapp?.linked ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Linked to <span className="font-medium text-foreground">{whatsapp.phone ?? "your number"}</span>.
                  You can study past papers, generate projects, and ask questions directly from WhatsApp.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={handleUnlinkWhatsApp}
                  disabled={unlinkLoading}
                >
                  {unlinkLoading ? "Disconnecting…" : "Disconnect WhatsApp"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect your WhatsApp number to study from anywhere — no app install needed,
                  works on any WhatsApp-only data bundle.
                </p>

                {linkCode ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-2">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Your link code</p>
                    <p className="text-3xl font-bold tracking-[0.25em] text-emerald-800 font-mono">
                      {linkCode.code}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Open WhatsApp, message the Pass bot, and send this code.
                      Expires at {new Date(linkCode.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground px-0 h-auto"
                      onClick={handleGenerateLinkCode}
                      disabled={linkLoading}
                    >
                      <HugeiconsIcon icon={LinkSquare02Icon} className="mr-1.5 h-3 w-3" />
                      Regenerate code
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleGenerateLinkCode}
                    disabled={linkLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <HugeiconsIcon icon={SmartPhone01Icon} className="mr-2 h-3.5 w-3.5" />
                    {linkLoading ? "Generating…" : "Connect WhatsApp"}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referral */}
      {!editing && referral && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                <HugeiconsIcon icon={CrownIcon} className="h-4 w-4 text-violet-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Refer a friend</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Share your referral code. For every friend who signs up, you get <strong>+2 paper credits</strong> and <strong>+1 project credit</strong>.
            </p>
            {referral.code && (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-input bg-muted/40 px-3 py-2 font-mono text-sm font-bold tracking-widest text-foreground">
                  {referral.code}
                </div>
                <Button variant="outline" size="sm" onClick={copyReferralLink} className="shrink-0">
                  <HugeiconsIcon icon={Copy01Icon} className="mr-1.5 h-3.5 w-3.5" />
                  {referralCopied ? "Copied!" : "Copy link"}
                </Button>
              </div>
            )}
            {(referral.bonusPapers > 0 || referral.bonusProjects > 0) && (
              <div className="flex gap-3 text-xs text-emerald-700">
                {referral.bonusPapers > 0 && (
                  <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium">
                    +{referral.bonusPapers} paper {referral.bonusPapers === 1 ? "credit" : "credits"} available
                  </span>
                )}
                {referral.bonusProjects > 0 && (
                  <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium">
                    +{referral.bonusProjects} project {referral.bonusProjects === 1 ? "credit" : "credits"} available
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {!editing && notifSettings && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <HugeiconsIcon icon={Notification01Icon} className="h-4 w-4 text-blue-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
              {notifSaving && <span className="ml-auto text-xs text-muted-foreground">Saving…</span>}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channels</p>
              {[
                { key: "emailEnabled" as const, label: "Email notifications" },
                { key: "webPushEnabled" as const, label: "Browser push notifications" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-foreground">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifSettings[key]}
                    onChange={(e) => patchNotifSettings({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alert types</p>
              {[
                { key: "paymentAlerts" as const, label: "Payment confirmations" },
                { key: "renewalAlerts" as const, label: "Subscription expiry reminders" },
                { key: "loginAlerts" as const, label: "New sign-in alerts" },
                { key: "referralAlerts" as const, label: "Referral rewards" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-foreground">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifSettings[key]}
                    onChange={(e) => patchNotifSettings({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
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
