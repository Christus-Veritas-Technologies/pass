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
import { useAppTheme } from "@/lib/theme-context";
import { env } from "@pass/env/native";

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

function scoreColor(n: number, colors: ReturnType<typeof useAppTheme>["colors"]) {
  if (n >= 80) return colors.success;
  if (n >= 60) return colors.warning;
  return colors.error;
}
function scoreBg(n: number, colors: ReturnType<typeof useAppTheme>["colors"]) {
  if (n >= 80) return colors.successBg;
  if (n >= 60) return colors.warningBg;
  return colors.errorBg;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

async function getToken() {
  try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={colors.brand} />}
      >
        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ paddingTop: 24, paddingBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>
              {userName ? `Hi, ${userName}` : "Dashboard"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>Keep the streak going.</Text>
          </View>
        </MotiView>

        {/* Stats row */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 50, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {[
              { Icon: Note,        label: "Papers",    value: String(stats?.papersAttempted ?? 0), bg: colors.indigoBg, border: colors.indigoBorder, iconColor: colors.brand },
              { Icon: CheckCircle, label: "Questions", value: String(stats?.questionsAnswered ?? 0), bg: colors.greenBg, border: colors.greenBorder, iconColor: colors.success },
              { Icon: Fire,        label: "Streak",    value: `${stats?.currentStreak ?? 0}d`,      bg: colors.orangeBg, border: colors.orangeBorder, iconColor: colors.warning },
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
                <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 6 }}>{value}</Text>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>{label}</Text>
              </View>
            ))}
          </View>
        </MotiView>

        {/* Weekly goal */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View
            style={{
              backgroundColor: colors.indigoBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.indigoBorder,
              padding: 14,
              marginBottom: 28,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TrendUp size={15} color={colors.brand} />
              <Text style={{ fontSize: 12, fontWeight: "500", color: colors.brand }}>Weekly goal</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 4 }}>
              {stats?.weeklyProgress ?? 0}
              <Text style={{ fontSize: 13, fontWeight: "400", color: colors.textTertiary }}>
                /{stats?.weeklyGoal ?? 5} papers
              </Text>
            </Text>
            <ProgressBar value={stats?.weeklyProgress ?? 0} max={stats?.weeklyGoal ?? 5} color={colors.brand} />
          </View>
        </MotiView>

        {/* Recent papers */}
        <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 250, delay: 150, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Recent papers</Text>
              <Pressable onPress={() => router.push("/(drawer)/(tabs)/study" as never)}>
                <Text style={{ fontSize: 12, color: colors.brand }}>View all</Text>
              </Pressable>
            </View>

            {sessions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: colors.indigoBg, borderRadius: 12, borderWidth: 1, borderColor: colors.indigoBorder }}>
                <Note size={24} color={colors.brand} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.brand }}>No papers attempted yet</Text>
                <Pressable
                  onPress={() => router.push("/study/new" as never)}
                  style={{ marginTop: 4, backgroundColor: colors.brand, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}
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
                      backgroundColor: colors.cardSubtle,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Note size={18} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }} numberOfLines={1}>
                        {s.paperTitle}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                        {s.subject} · {timeAgo(s.completedAt)}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: scoreBg(s.questionsAnswered, colors),
                        borderRadius: 20,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginLeft: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: scoreColor(s.questionsAnswered, colors) }}>
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
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Featured resources</Text>
              <Pressable onPress={() => router.push("/(drawer)/(tabs)/resources")}>
                <Text style={{ fontSize: 12, color: colors.brand }}>View all</Text>
              </Pressable>
            </View>

            {resources.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: colors.cardSubtle, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle }}>
                <BookOpen size={24} color={colors.textPlaceholder} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.textTertiary }}>No resources yet</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {resources.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.cardSubtle,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                      padding: 14,
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={18} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }} numberOfLines={1}>{r.title}</Text>
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>{r.subject} · {r.type}</Text>
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
