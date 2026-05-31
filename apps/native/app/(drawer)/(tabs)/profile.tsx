import { ArrowRight, X, CheckCircle, Crown, Moon, Monitor, PencilSimple, SignOut, Sun, WarningCircle, Copy } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { env } from "@pass/env/native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppTheme } from "@/lib/theme-context";
import type { ThemePreference } from "@/lib/theme";

const API = env.EXPO_PUBLIC_SERVER_URL;
const GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];

const HEADER_HEIGHT = 160;
const AVATAR_SIZE = 88;
const CONTENT_OVERLAP = 28;

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

const PLAN_LABEL: Record<string, string> = { FREE: "Free", STUDY: "Study", PASS: "Pass" };

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: "light",  label: "Light",  Icon: Sun },
  { value: "dark",   label: "Dark",   Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useAppTheme();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
    FREE:  { bg: colors.borderSubtle,   text: colors.textTertiary },
    STUDY: { bg: colors.warningBg,       text: colors.warning },
    PASS:  { bg: colors.purpleBg,        text: "#7C3AED" },
  };

  async function getToken() {
    try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
  }

  useEffect(() => {
    (async () => {
      const token = await getToken();
      try {
        const res = await fetch(`${API}/users/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setUser(data.user ?? null);
        setStats(data.stats ?? null);
        setPlanUsage(data.planUsage ?? null);
        if (data.referral) setReferral(data.referral as ReferralInfo);

        if (token) {
          if (data.user?.plan !== "FREE") {
            const subRes = await fetch(`${API}/payments/renewal-status`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const subData = await subRes.json();
            if (subData && !subData.error) setSubscription(subData);
          }

          const notifRes = await fetch(`${API}/notifications/settings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const notifData = await notifRes.json();
          if (notifData && !notifData.error) setNotifSettings(notifData as NotificationSettings);
        }
      } catch {}
      setLoading(false);
    })();
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

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveErr("");
    const token = await getToken();
    try {
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          grade: grade || undefined,
          school: school.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setUser(data.user);
      setSaveOk(true);
      setTimeout(() => { setEditing(false); setSaveOk(false); }, 1200);
    } catch (err: unknown) {
      setSaveErr((err as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyReferral() {
    if (!referral?.code) return;
    const url = `https://pass.co.zw/signup?ref=${referral.code}`;
    await Clipboard.setStringAsync(url);
  }

  async function patchNotifSettings(patch: Partial<NotificationSettings>) {
    const token = await getToken();
    if (!token || !notifSettings) return;
    const updated = { ...notifSettings, ...patch };
    setNotifSettings(updated); // optimistic update

    // When enabling native push, register the device token first
    if (patch.nativePushEnabled === true) {
      try {
        const { registerPushToken } = await import("@/lib/auth");
        await registerPushToken();
      } catch { /* non-fatal */ }
    }

    // When disabling native push, unregister the device token from the server
    if (patch.nativePushEnabled === false && token) {
      try {
        const Notifications = await import("expo-notifications");
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: "31966f37-762e-44f9-9da4-2aa43d262227" });
        fetch(`${API}/notifications/native-push/register`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenData.data }),
        }).catch(() => undefined);
      } catch { /* non-fatal — push settings still saved */ }
    }

    fetch(`${API}/notifications/settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
  }

  async function handleLogout() {
    try {
      await SecureStore.deleteItemAsync("pass_access_token");
      await SecureStore.deleteItemAsync("pass_refresh_token");
    } catch {}
    router.replace("/(auth)/login" as never);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  const initials = user?.name ? getInitials(user.name) : "?";
  const planStyle = PLAN_COLOR[user?.plan ?? "FREE"] ?? PLAN_COLOR.FREE;

  // ─── Edit mode ────────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardSubtle }} edges={["top"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Pressable
              onPress={() => setEditing(false)}
              style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.borderSubtle, alignItems: "center", justifyContent: "center" }}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>Edit Profile</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 18, gap: 14 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 }}>FULL NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.text, backgroundColor: colors.cardSubtle }}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textPlaceholder}
                />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textTertiary, letterSpacing: 0.5, marginBottom: 8 }}>GRADE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {["", ...GRADES].map((g) => (
                    <Pressable
                      key={g || "none"}
                      onPress={() => setGrade(g)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                        borderWidth: 1,
                        borderColor: grade === g ? colors.brand : colors.border,
                        backgroundColor: grade === g ? colors.indigoBg : colors.card,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "500", color: grade === g ? colors.brand : colors.textTertiary }}>
                        {g || "None"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 }}>SCHOOL</Text>
                <TextInput
                  value={school}
                  onChangeText={setSchool}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.text, backgroundColor: colors.cardSubtle }}
                  placeholder="Your school name"
                  placeholderTextColor={colors.textPlaceholder}
                />
              </View>
            </View>

            {saveErr ? <Text style={{ fontSize: 12, color: colors.error, textAlign: "center" }}>{saveErr}</Text> : null}
            {saveOk ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <CheckCircle size={16} color={colors.success} />
                <Text style={{ fontSize: 13, color: colors.success, fontWeight: "500" }}>Saved!</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={saving || !name.trim()}
              style={{
                backgroundColor: saving || !name.trim() ? `${colors.brand}80` : colors.brand,
                borderRadius: 12, paddingVertical: 14, alignItems: "center",
              }}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Save changes</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── View mode ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brand }} edges={["top"]}>
      <View style={{ flex: 1, position: "relative" }}>

        {/* Purple header band */}
        <View style={{ height: HEADER_HEIGHT, backgroundColor: colors.brand, paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.8, textTransform: "uppercase" }}>
            Your profile
          </Text>
          {user?.grade ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>{user.grade}</Text>
              </View>
              {user.school ? (
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "500" }} numberOfLines={1}>
                  {user.school}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Content sheet */}
        <View style={{
          position: "absolute",
          top: HEADER_HEIGHT - CONTENT_OVERLAP,
          left: 0, right: 0, bottom: 0,
          backgroundColor: colors.background,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
        }}>
          <ScrollView contentContainerStyle={{ paddingTop: AVATAR_SIZE / 2 + 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* Name + plan */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ alignItems: "center", paddingHorizontal: 24, marginBottom: 8 }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 }}>
                {user?.name ?? "—"}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 3 }}>{user?.email ?? ""}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                {user?.grade && <Badge variant="default">{user.grade}</Badge>}
                <View style={{ backgroundColor: planStyle.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {user?.plan !== "FREE" && <Crown size={11} color={planStyle.text} />}
                  <Text style={{ fontSize: 12, fontWeight: "600", color: planStyle.text }}>{PLAN_LABEL[user?.plan ?? "FREE"] ?? "Free"}</Text>
                </View>
              </View>
            </MotiView>

            {/* Info rows */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: 50, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ marginHorizontal: 20, marginTop: 12 }}
            >
              <Card style={{ backgroundColor: colors.card }}>
                {[
                  { label: "Email", value: user?.email ?? "—" },
                  { label: "Grade", value: user?.grade ?? "—" },
                  { label: "School", value: user?.school ?? "—" },
                ].map(({ label, value }, idx, arr) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                      paddingHorizontal: 16, paddingVertical: 13,
                      borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                      borderBottomColor: colors.borderSubtle,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.textPlaceholder, fontWeight: "500" }}>{label}</Text>
                    <Text style={{ fontSize: 13, color: value === "—" ? colors.border : colors.textSecondary, fontWeight: "500", maxWidth: "65%" }} numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                ))}
              </Card>
            </MotiView>

            {/* Stats */}
            {stats && (
              <MotiView
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 220, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                style={{ marginHorizontal: 20, marginTop: 12 }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textPlaceholder, letterSpacing: 0.5, marginBottom: 10, paddingLeft: 2 }}>YOUR STATS</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    { label: "Papers", value: stats.papersAttempted },
                    { label: "Questions", value: stats.questionsAnswered },
                    { label: "Weekly", value: `${stats.weeklyProgress}/${stats.weeklyGoal}` },
                  ].map(({ label, value }) => (
                    <Card key={label} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12 }}>
                      <CardContent style={{ padding: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>{value}</Text>
                        <Text style={{ fontSize: 10, color: colors.textPlaceholder, marginTop: 2, fontWeight: "500" }}>{label}</Text>
                      </CardContent>
                    </Card>
                  ))}
                </View>
              </MotiView>
            )}

            {/* Plan & Usage */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ marginHorizontal: 20, marginTop: 12 }}
            >
              <Card style={{ backgroundColor: colors.card }}>
                <CardHeader style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <CardTitle>Plan & Usage</CardTitle>
                  <View style={{ backgroundColor: planStyle.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {user?.plan !== "FREE" && <Crown size={10} color={planStyle.text} />}
                    <Text style={{ fontSize: 11, fontWeight: "700", color: planStyle.text }}>
                      {PLAN_LABEL[user?.plan ?? "FREE"] ?? "Free"}
                    </Text>
                  </View>
                </CardHeader>
                <CardContent style={{ gap: 16 }}>
                  {planUsage ? (
                    <>
                      {[
                        { label: "Papers this month", key: "papers" as const, color: colors.brand },
                        { label: "AI Projects this month", key: "projects" as const, color: "#7C3AED" },
                      ].map(({ label, key, color }) => {
                        const { used, limit } = planUsage[key];
                        const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                        const almostFull = pct >= 80;
                        return (
                          <View key={key}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>{label}</Text>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: almostFull ? colors.error : colors.text }}>
                                {used} / {limit}
                              </Text>
                            </View>
                            <Progress value={pct} color={almostFull ? colors.error : color} height={7} />
                          </View>
                        );
                      })}
                      {user?.plan === "FREE" && (
                        <View style={{ backgroundColor: colors.warningBg, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Crown size={16} color={colors.warning} />
                          <Text style={{ flex: 1, fontSize: 12, color: colors.warning, fontWeight: "500", lineHeight: 18 }}>
                            Upgrade to Study or Pass for more papers and projects each month.
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ fontSize: 13, color: colors.textPlaceholder }}>Usage data unavailable</Text>
                  )}
                </CardContent>
              </Card>
            </MotiView>

            {/* Subscription Status */}
            {subscription && (user?.plan === "STUDY" || user?.plan === "PASS") && (
              <MotiView
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 220, delay: 115, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                style={{ marginHorizontal: 20, marginTop: 12 }}
              >
                <Card style={subscription.renewalDue ? { backgroundColor: colors.warningBg, borderColor: colors.warningBorder } : { backgroundColor: colors.card }}>
                  <CardHeader style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: subscription.renewalDue ? colors.warningBorder : colors.successBg, alignItems: "center", justifyContent: "center" }}>
                        {subscription.renewalDue
                          ? <WarningCircle size={16} color={colors.warning} />
                          : <Crown size={16} color={colors.success} />
                        }
                      </View>
                      <CardTitle>Your subscription</CardTitle>
                    </View>
                    <View style={{ backgroundColor: subscription.renewalDue ? colors.warningBg : colors.successBg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: subscription.renewalDue ? colors.warning : colors.success }}>
                        {subscription.status === "ACTIVE" ? "Active" : "Expired"}
                      </Text>
                    </View>
                  </CardHeader>
                  <CardContent style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ fontSize: 11, color: colors.textPlaceholder, fontWeight: "500", marginBottom: 4 }}>Expires on</Text>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                          {new Date(subscription.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 11, color: colors.textPlaceholder, fontWeight: "500", marginBottom: 4 }}>Days left</Text>
                        <Text style={{ fontSize: 18, fontWeight: "800", color: subscription.renewalDue ? colors.warning : colors.brand }}>
                          {subscription.daysRemaining}d
                        </Text>
                      </View>
                    </View>
                    {subscription.renewalDue && (
                      <View style={{ backgroundColor: colors.warningBorder, borderRadius: 8, padding: 10 }}>
                        <Text style={{ fontSize: 11, color: colors.warning, fontWeight: "600" }}>
                          Your subscription is expiring soon! Renew now to keep access.
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => router.push({ pathname: "/checkout" as never, params: { plan: subscription.plan } as never })}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? "#4338CA" : colors.brand,
                        borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 2,
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                        {subscription.renewalDue ? "Renew now" : "Manage"}
                      </Text>
                    </Pressable>
                  </CardContent>
                </Card>
              </MotiView>
            )}

            {/* Referral */}
            {referral && (
              <MotiView
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 220, delay: 115, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                style={{ marginHorizontal: 20, marginTop: 12 }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textPlaceholder, letterSpacing: 0.5, marginBottom: 10, paddingLeft: 2 }}>REFER A FRIEND</Text>
                <Card style={{ backgroundColor: colors.card }}>
                  <CardContent style={{ gap: 12 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                      Share your code — earn <Text style={{ fontWeight: "700", color: colors.text }}>+2 paper credits</Text> and <Text style={{ fontWeight: "700", color: colors.text }}>+1 project credit</Text> per signup.
                    </Text>
                    {referral.code && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ flex: 1, backgroundColor: colors.cardSubtle, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontSize: 16, fontWeight: "800", letterSpacing: 4, color: colors.text, fontVariant: ["tabular-nums"] }}>{referral.code}</Text>
                        </View>
                        <Pressable
                          onPress={handleCopyReferral}
                          style={({ pressed }) => ({
                            width: 42, height: 42, borderRadius: 10,
                            backgroundColor: pressed ? colors.indigoBg : colors.indigoBg,
                            borderWidth: 1, borderColor: colors.indigoBorder,
                            alignItems: "center", justifyContent: "center",
                          })}
                        >
                          <Copy size={16} color={colors.brand} />
                        </Pressable>
                      </View>
                    )}
                    {(referral.bonusPapers > 0 || referral.bonusProjects > 0) && (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {referral.bonusPapers > 0 && (
                          <View style={{ backgroundColor: colors.successBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>+{referral.bonusPapers} paper {referral.bonusPapers === 1 ? "credit" : "credits"}</Text>
                          </View>
                        )}
                        {referral.bonusProjects > 0 && (
                          <View style={{ backgroundColor: colors.successBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>+{referral.bonusProjects} project {referral.bonusProjects === 1 ? "credit" : "credits"}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </CardContent>
                </Card>
              </MotiView>
            )}

            {/* Notification Settings */}
            {notifSettings && (
              <MotiView
                from={{ opacity: 0, translateY: 6 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 220, delay: 117, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                style={{ marginHorizontal: 20, marginTop: 12 }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textPlaceholder, letterSpacing: 0.5, marginBottom: 10, paddingLeft: 2 }}>NOTIFICATIONS</Text>
                <Card style={{ backgroundColor: colors.card }}>
                  <CardContent style={{ gap: 0 }}>
                    {[
                      { key: "nativePushEnabled" as const, label: "Push notifications" },
                      { key: "emailEnabled" as const, label: "Email notifications" },
                      { key: "paymentAlerts" as const, label: "Payment confirmations" },
                      { key: "renewalAlerts" as const, label: "Subscription reminders" },
                      { key: "loginAlerts" as const, label: "New sign-in alerts" },
                      { key: "referralAlerts" as const, label: "Referral rewards" },
                    ].map(({ key, label }, idx, arr) => (
                      <View
                        key={key}
                        style={{
                          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                          paddingVertical: 13,
                          borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                          borderBottomColor: colors.borderSubtle,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: "500" }}>{label}</Text>
                        <Switch
                          value={notifSettings[key]}
                          onValueChange={(v) => patchNotifSettings({ [key]: v })}
                          trackColor={{ false: colors.borderSubtle, true: colors.brand }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    ))}
                  </CardContent>
                </Card>
              </MotiView>
            )}

            {/* Theme toggle */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: 120, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ marginHorizontal: 20, marginTop: 12 }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textPlaceholder, letterSpacing: 0.5, marginBottom: 10, paddingLeft: 2 }}>APPEARANCE</Text>
              <Card style={{ backgroundColor: colors.card }}>
                <View style={{ flexDirection: "row", padding: 8, gap: 6 }}>
                  {THEME_OPTIONS.map(({ value, label, Icon }) => {
                    const active = preference === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setPreference(value)}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: active ? colors.indigoBg : "transparent",
                          borderWidth: active ? 1 : 0,
                          borderColor: active ? colors.indigoBorder : "transparent",
                        }}
                      >
                        <Icon size={15} color={active ? colors.brand : colors.textTertiary} />
                        <Text style={{ fontSize: 13, fontWeight: active ? "600" : "400", color: active ? colors.brand : colors.textTertiary }}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            </MotiView>

            {/* Menu rows */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: 130, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ marginHorizontal: 20, marginTop: 12 }}
            >
              <Card style={{ backgroundColor: colors.card }}>
                {/* Edit profile */}
                <Pressable
                  onPress={startEdit}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 16, paddingVertical: 15,
                    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
                    backgroundColor: pressed ? colors.cardSubtle : colors.card,
                  })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
                    <PencilSimple size={16} color={colors.brand} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.text }}>Edit profile</Text>
                  <ArrowRight size={16} color={colors.border} />
                </Pressable>

                {/* Upgrade — only FREE plan */}
                {user?.plan === "FREE" && (
                  <Pressable
                    onPress={() => router.push({ pathname: "/checkout" as never, params: { plan: "STUDY" } as never })}
                    style={({ pressed }) => ({
                      flexDirection: "row", alignItems: "center", gap: 12,
                      paddingHorizontal: 16, paddingVertical: 15,
                      borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
                      backgroundColor: pressed ? colors.warningBg : colors.card,
                    })}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.warningBg, alignItems: "center", justifyContent: "center" }}>
                      <Crown size={16} color={colors.warning} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.text }}>Upgrade plan</Text>
                    <ArrowRight size={16} color={colors.border} />
                  </Pressable>
                )}

                {/* Sign out */}
                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 16, paddingVertical: 15,
                    backgroundColor: pressed ? colors.errorBg : colors.card,
                  })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.errorBg, alignItems: "center", justifyContent: "center" }}>
                    <SignOut size={16} color={colors.error} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.error }}>Sign out</Text>
                </Pressable>
              </Card>
            </MotiView>

          </ScrollView>
        </View>

        {/* Avatar — straddles header/content boundary */}
        <View style={{
          position: "absolute",
          top: HEADER_HEIGHT - CONTENT_OVERLAP - AVATAR_SIZE / 2,
          left: 0, right: 0,
          alignItems: "center",
          zIndex: 10,
        }}>
          <Avatar
            size={AVATAR_SIZE}
            initials={initials !== "?" ? initials : undefined}
            color={colors.brand}
            borderWidth={4}
            borderColor={colors.background}
          />
        </View>

      </View>
    </SafeAreaView>
  );
}
