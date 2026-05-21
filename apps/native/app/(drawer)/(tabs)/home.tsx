import { BookOpen, CheckCircle, Fire, Note, TrendUp } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Easing } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/animated-pressable";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;

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
  grade: string;
  questionsAnswered: number;
  completedAt: string;
}

interface FeaturedResource {
  id: string;
  title: string;
  subject: string;
  type: string;
}

function scoreColor(n: number) {
  if (n >= 80) return "#059669";
  if (n >= 60) return "#D97706";
  return "#DC2626";
}
function scoreBg(n: number) {
  if (n >= 80) return "#ECFDF5";
  if (n >= 60) return "#FFFBEB";
  return "#FEF2F2";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: BRAND, borderRadius: 3 }} />
    </View>
  );
}

async function getToken() {
  try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [resources, setResources] = useState<FeaturedResource[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const [meRes, sessionsRes, resourcesRes] = await Promise.allSettled([
      fetch(`${API}/users/me`, { headers }),
      fetch(`${API}/papers/sessions/recent`, { headers }),
      fetch(`${API}/resources/featured`),
    ]);

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
    setRefreshing(false);
  }

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={BRAND} />}
      >
        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ paddingTop: 24, paddingBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
              {userName ? `Hi, ${userName}` : "Dashboard"}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Keep the streak going.</Text>
          </View>
        </MotiView>

        {/* Stats row */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 50, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {[
              { Icon: Note,        label: "Papers",    value: String(stats?.papersAttempted ?? 0), bg: "#EEF2FF", border: "#C7D2FE", iconColor: "#4F46E5" },
              { Icon: CheckCircle, label: "Questions", value: String(stats?.questionsAnswered ?? 0), bg: "#ECFDF5", border: "#6EE7B7", iconColor: "#059669" },
              { Icon: Fire,        label: "Streak",    value: `${stats?.currentStreak ?? 0}d`,      bg: "#FFF7ED", border: "#FED7AA", iconColor: "#EA580C" },
            ].map(({ Icon, label, value, bg, border, iconColor }) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  backgroundColor: bg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: border,
                  padding: 12,
                }}
              >
                <Icon size={16} color={iconColor} />
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 6 }}>{value}</Text>
                <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{label}</Text>
              </View>
            ))}
          </View>
        </MotiView>

        {/* Weekly goal */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View
            style={{
              backgroundColor: "#EEF2FF",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#C7D2FE",
              padding: 14,
              marginBottom: 28,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TrendUp size={15} color="#4F46E5" />
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#4338CA" }}>Weekly goal</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 4 }}>
              {stats?.weeklyProgress ?? 0}
              <Text style={{ fontSize: 13, fontWeight: "400", color: "#9CA3AF" }}>
                /{stats?.weeklyGoal ?? 5} papers
              </Text>
            </Text>
            <ProgressBar value={stats?.weeklyProgress ?? 0} max={stats?.weeklyGoal ?? 5} />
          </View>
        </MotiView>

        {/* Recent papers */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 150, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>Recent papers</Text>
              <Pressable onPress={() => router.push("/(drawer)/(tabs)/study" as never)}>
                <Text style={{ fontSize: 12, color: BRAND }}>View all</Text>
              </Pressable>
            </View>

            {sessions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: "#EEF2FF", borderRadius: 12, borderWidth: 1, borderColor: "#C7D2FE" }}>
                <Note size={24} color="#A5B4FC" />
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#4338CA" }}>No papers attempted yet</Text>
                <Pressable
                  onPress={() => router.push("/study/new" as never)}
                  style={{ marginTop: 4, backgroundColor: BRAND, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Start studying</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {sessions.slice(0, 5).map((s) => (
                  <AnimatedPressable
                    key={s.id}
                    onPress={() => router.push(`/papers/${s.paperId}` as never)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#FAFAFA",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      padding: 14,
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Note size={18} color={BRAND} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={1}>
                        {s.paperTitle}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                        {s.subject} · {timeAgo(s.completedAt)}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: scoreBg(s.questionsAnswered),
                        borderRadius: 20,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginLeft: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: scoreColor(s.questionsAnswered) }}>
                        {s.questionsAnswered}q
                      </Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </View>
            )}
          </View>
        </MotiView>

        {/* Featured resources */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>Featured resources</Text>
              <Pressable onPress={() => router.push("/(drawer)/(tabs)/resources")}>
                <Text style={{ fontSize: 12, color: BRAND }}>View all</Text>
              </Pressable>
            </View>

            {resources.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6" }}>
                <BookOpen size={24} color="#D1D5DB" />
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#6B7280" }}>No resources yet</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {resources.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#F3F4F6",
                      padding: 14,
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={18} color={BRAND} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={1}>{r.title}</Text>
                      <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{r.subject} · {r.type}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}
