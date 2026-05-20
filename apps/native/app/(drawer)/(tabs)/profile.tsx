import { ArrowRight, X, CheckCircle, Crown, PencilSimple, SignOut, WarningCircle } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
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

const BRAND = "#4F46E5";
const BRAND_LIGHT = "#6366F1";
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

const PLAN_LABEL: Record<string, string> = { FREE: "Free", STUDY: "Study", PASS: "Pass" };
const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
  FREE: { bg: "#F3F4F6", text: "#6B7280" },
  STUDY: { bg: "#FEF3C7", text: "#D97706" },
  PASS: { bg: "#EDE9FE", text: "#7C3AED" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");

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

        // Fetch subscription info if user has paid plan
        if (token && data.user?.plan !== "FREE") {
          const subRes = await fetch(`${API}/payments/renewal-status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const subData = await subRes.json();
          if (subData && !subData.error) {
            setSubscription(subData);
          }
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

  async function handleLogout() {
    try {
      await SecureStore.deleteItemAsync("pass_access_token");
      await SecureStore.deleteItemAsync("pass_refresh_token");
    } catch {}
    router.replace("/(auth)/login" as never);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  const initials = user?.name ? getInitials(user.name) : "?";
  const planStyle = PLAN_COLOR[user?.plan ?? "FREE"] ?? PLAN_COLOR.FREE;

  // ─── Edit mode ────────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Pressable
              onPress={() => setEditing(false)}
              style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}
            >
              <X size={18} color="#374151" />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>Edit Profile</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 18, gap: 14 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280", letterSpacing: 0.5, marginBottom: 6 }}>FULL NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827" }}
                  placeholder="Your full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280", letterSpacing: 0.5, marginBottom: 8 }}>GRADE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {["", ...GRADES].map((g) => (
                    <Pressable
                      key={g || "none"}
                      onPress={() => setGrade(g)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                        borderWidth: 1,
                        borderColor: grade === g ? BRAND : "#E5E7EB",
                        backgroundColor: grade === g ? "#EEF2FF" : "#FFFFFF",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "500", color: grade === g ? BRAND : "#6B7280" }}>
                        {g || "None"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280", letterSpacing: 0.5, marginBottom: 6 }}>SCHOOL</Text>
                <TextInput
                  value={school}
                  onChangeText={setSchool}
                  style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827" }}
                  placeholder="Your school name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {saveErr ? <Text style={{ fontSize: 12, color: "#DC2626", textAlign: "center" }}>{saveErr}</Text> : null}
            {saveOk ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <CheckCircle size={16} color="#059669" />
                <Text style={{ fontSize: 13, color: "#059669", fontWeight: "500" }}>Saved!</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={saving || !name.trim()}
              style={{
                backgroundColor: saving || !name.trim() ? "#A5B4FC" : BRAND,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND }} edges={["top"]}>
      <View style={{ flex: 1, position: "relative" }}>

        {/* Purple header band */}
        <View style={{ height: HEADER_HEIGHT, backgroundColor: BRAND }} />

        {/* White content sheet */}
        <View style={{
          position: "absolute",
          top: HEADER_HEIGHT - CONTENT_OVERLAP,
          left: 0, right: 0, bottom: 0,
          backgroundColor: "#FFFFFF",
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
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", letterSpacing: -0.5 }}>
                {user?.name ?? "—"}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>{user?.email ?? ""}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                {user?.grade && (
                  <Badge variant="default">{user.grade}</Badge>
                )}
                <View style={{ backgroundColor: planStyle.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {user?.plan !== "FREE" && <Crown size={11} color={planStyle.text} />}
                  <Text style={{ fontSize: 12, fontWeight: "600", color: planStyle.text }}>{PLAN_LABEL[user?.plan ?? "FREE"] ?? "Free"}</Text>
                </View>
              </View>
            </MotiView>

            {/* Info rows — email + school */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: 50, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ marginHorizontal: 20, marginTop: 12 }}
            >
              <Card style={{ backgroundColor: "#F9FAFB" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "500" }}>Mail</Text>
                  <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }} numberOfLines={1}>{user?.email ?? "—"}</Text>
                </View>
                {user?.school ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 }}>
                    <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "500" }}>School</Text>
                    <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }} numberOfLines={1}>{user.school}</Text>
                  </View>
                ) : null}
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
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 10, paddingLeft: 2 }}>YOUR STATS</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    { label: "Papers", value: stats.papersAttempted },
                    { label: "Questions", value: stats.questionsAnswered },
                    { label: "Weekly", value: `${stats.weeklyProgress}/${stats.weeklyGoal}` },
                  ].map(({ label, value }) => (
                    <Card key={label} style={{ flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12 }}>
                      <CardContent style={{ padding: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{value}</Text>
                        <Text style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, fontWeight: "500" }}>{label}</Text>
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
              <Card>
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
                        { label: "Papers this month", key: "papers" as const, color: BRAND },
                        { label: "AI Projects this month", key: "projects" as const, color: "#7C3AED" },
                      ].map(({ label, key, color }) => {
                        const { used, limit } = planUsage[key];
                        const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                        const almostFull = pct >= 80;
                        return (
                          <View key={key}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                              <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>{label}</Text>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: almostFull ? "#DC2626" : "#111827" }}>
                                {used} / {limit}
                              </Text>
                            </View>
                            <Progress
                              value={pct}
                              color={almostFull ? "#EF4444" : color}
                              height={7}
                            />
                          </View>
                        );
                      })}
                      {user?.plan === "FREE" && (
                        <View style={{ backgroundColor: "#FEF3C7", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Crown size={16} color="#D97706" />
                          <Text style={{ flex: 1, fontSize: 12, color: "#92400E", fontWeight: "500", lineHeight: 18 }}>
                            Upgrade to Study or Pass for more papers and projects each month.
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ fontSize: 13, color: "#9CA3AF" }}>Usage data unavailable</Text>
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
                <Card style={subscription.renewalDue ? { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" } : undefined}>
                  <CardHeader style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: subscription.renewalDue ? "#FCD34D" : "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
                        {subscription.renewalDue
                          ? <WarningCircle size={16} color="#D97706" />
                          : <Crown size={16} color="#059669" />
                        }
                      </View>
                      <CardTitle>Your subscription</CardTitle>
                    </View>
                    <View style={{ backgroundColor: subscription.renewalDue ? "#FEF3C7" : "#DCFCE7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: subscription.renewalDue ? "#B45309" : "#059669" }}>
                        {subscription.status === "ACTIVE" ? "Active" : "Expired"}
                      </Text>
                    </View>
                  </CardHeader>
                  <CardContent style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 }}>Expires on</Text>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
                          {new Date(subscription.expiryDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 }}>Days left</Text>
                        <Text style={{ fontSize: 18, fontWeight: "800", color: subscription.renewalDue ? "#D97706" : "#4F46E5" }}>
                          {subscription.daysRemaining}d
                        </Text>
                      </View>
                    </View>
                    {subscription.renewalDue && (
                      <View style={{ backgroundColor: "#FED7AA", borderRadius: 8, padding: 10 }}>
                        <Text style={{ fontSize: 11, color: "#92400E", fontWeight: "600" }}>
                          Your subscription is expiring soon! Renew now to keep access.
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => router.push({
                        pathname: "/checkout" as never,
                        params: { plan: subscription.plan } as never,
                      })}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? "#4338CA" : BRAND,
                        borderRadius: 10,
                        paddingVertical: 11,
                        alignItems: "center",
                        marginTop: 2,
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

            {/* Menu rows */}
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: 130, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ marginHorizontal: 20, marginTop: 20 }}
            >
            <Card>
              {/* Edit profile */}
              <Pressable
                onPress={startEdit}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingVertical: 15,
                  borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                  backgroundColor: pressed ? "#F9FAFB" : "#FFFFFF",
                })}
              >
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                  <PencilSimple size={16} color={BRAND} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#111827" }}>Edit profile</Text>
                <ArrowRight size={16} color="#D1D5DB" />
              </Pressable>

              {/* Upgrade — only FREE plan */}
              {user?.plan === "FREE" && (
                <Pressable
                  onPress={() => router.push({
                    pathname: "/checkout" as never,
                    params: { plan: "STUDY" } as never,
                  })}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 16, paddingVertical: 15,
                    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
                    backgroundColor: pressed ? "#FFFBEB" : "#FFFFFF",
                  })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" }}>
                    <Crown size={16} color="#D97706" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#111827" }}>Upgrade plan</Text>
                  <ArrowRight size={16} color="#D1D5DB" />
                </Pressable>
              )}

              {/* Sign out */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingVertical: 15,
                  backgroundColor: pressed ? "#FEF2F2" : "#FFFFFF",
                })}
              >
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                  <SignOut size={16} color="#DC2626" />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#DC2626" }}>Sign out</Text>
              </Pressable>
            </Card>
            </MotiView>

          </ScrollView>
        </View>

        {/* Avatar — positioned to straddle header/content boundary */}
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
            color={BRAND_LIGHT}
            borderWidth={4}
            borderColor="#FFFFFF"
          />
        </View>

      </View>
    </SafeAreaView>
  );
}
