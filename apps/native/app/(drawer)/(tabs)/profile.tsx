import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Crown01Icon,
  Edit01Icon,
  Logout01Icon,
  User01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
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

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;
const GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];

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

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  FREE:  { bg: "#F3F4F6", text: "#6B7280" },
  STUDY: { bg: "#FFFBEB", text: "#D97706" },
  PASS:  { bg: "#FEF3C7", text: "#92400E" },
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser]     = useState<UserProfile | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [name, setName]     = useState("");
  const [grade, setGrade]   = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  async function getToken() {
    try { return await AsyncStorage.getItem("pass_access_token"); } catch { return null; }
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
    try { await AsyncStorage.multiRemove(["pass_access_token", "pass_refresh_token"]); } catch {}
    router.replace("/(auth)/login" as never);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  const planColor = PLAN_COLORS[user?.plan ?? "FREE"] ?? PLAN_COLORS.FREE;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 350 }}>
          <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, alignItems: "center" }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <HugeiconsIcon icon={User01Icon} size={36} color={BRAND} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{user?.name ?? "—"}</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{user?.email}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              {user?.grade && (
                <View style={{ backgroundColor: "#EEF2FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: BRAND }}>{user.grade}</Text>
                </View>
              )}
              <View style={{ backgroundColor: planColor.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                {user?.plan !== "FREE" && <HugeiconsIcon icon={Crown01Icon} size={12} color={planColor.text} />}
                <Text style={{ fontSize: 12, fontWeight: "600", color: planColor.text }}>{user?.plan ?? "FREE"}</Text>
              </View>
            </View>
            {user?.school && (
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{user.school}</Text>
            )}
          </View>
          </MotiView>

          {/* Stats */}
          {stats && (
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 350, delay: 80 }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 12 }}>Your stats</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <StatCard label="Papers" value={stats.papersAttempted} />
                <StatCard label="Questions" value={stats.questionsAnswered} />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Day streak" value={stats.currentStreak} />
                <StatCard label={`Weekly (/${stats.weeklyGoal})`} value={stats.weeklyProgress} />
              </View>
            </View>
            </MotiView>
          )}

          {/* Actions */}
          {editing ? (
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 18 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 16 }}>Edit Profile</Text>

              <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>FULL NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827", marginBottom: 14 }}
              />

              <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 8 }}>GRADE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                {["", ...GRADES].map((g) => (
                  <Pressable
                    key={g || "none"}
                    onPress={() => setGrade(g)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
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

              <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>SCHOOL</Text>
              <TextInput
                placeholder="Your school name"
                placeholderTextColor="#9CA3AF"
                value={school}
                onChangeText={setSchool}
                style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827", marginBottom: 16 }}
              />

              {saveErr ? <Text style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{saveErr}</Text> : null}
              {saveOk ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="#059669" />
                  <Text style={{ fontSize: 13, color: "#059669", fontWeight: "500" }}>Saved!</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={handleSave}
                  disabled={saving || !name.trim()}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: saving || !name.trim() ? "#A5B4FC" : BRAND,
                    borderRadius: 12,
                    paddingVertical: 13,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Save changes</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                  }}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} color="#6B7280" />
                </Pressable>
              </View>
            </View>
          ) : (
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 350, delay: 160 }}>
            <View style={{ marginHorizontal: 20, marginTop: 20, gap: 10 }}>
              {/* Edit button */}
              <Pressable
                onPress={startEdit}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#F3F4F6",
                  padding: 16,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                  <HugeiconsIcon icon={Edit01Icon} size={18} color={BRAND} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: "#111827" }}>Edit profile</Text>
                <HugeiconsIcon icon={Cancel01Icon} size={16} color="#9CA3AF" style={{ transform: [{ rotate: "45deg" }] }} />
              </Pressable>

              {/* Plan */}
              {user?.plan === "FREE" && (
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", padding: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center" }}>
                      <HugeiconsIcon icon={Crown01Icon} size={18} color="#D97706" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>Upgrade to Study or Pass</Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Unlock unlimited papers and projects</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: BRAND, borderRadius: 10, paddingVertical: 11, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>View plans</Text>
                  </View>
                </View>
              )}

              {/* Logout */}
              <Pressable
                onPress={handleLogout}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "#FEF2F2",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  padding: 16,
                  marginTop: 4,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                  <HugeiconsIcon icon={Logout01Icon} size={18} color="#DC2626" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#DC2626" }}>Sign out</Text>
              </Pressable>
            </View>
            </MotiView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
