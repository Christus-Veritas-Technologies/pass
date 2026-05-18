import {
  CheckmarkCircle01Icon,
  GraduationScrollIcon,
  PlusSignIcon,
  TaskDaily01Icon,
  TrendUp01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;

interface Session {
  id: string;
  paperId: string;
  paperTitle: string;
  subject: string;
  grade: string;
  mode: "GUIDE" | "FREE";
  questionsAnswered: number;
  completedAt: string;
}

interface StudyStats {
  sessionsCompleted: number;
  sessionsStarted: number;
  passRate: number;
  totalQuestionsAnswered: number;
  sessions: Session[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

async function getToken() {
  try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
}

function StatCard({ icon, label, value, sub }: { icon: unknown; label: string; value: string | number; sub?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <HugeiconsIcon icon={icon as never} size={14} color="#6B7280" />
        <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>{value}</Text>
      {sub && <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

export default function StudyScreen() {
  const router = useRouter();
  const [data, setData] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStats(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const token = await getToken();
    try {
      const res = await fetch(`${API}/study/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchStats(); }, []);

  // Re-fetch when tab comes into focus so stats update after a session
  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} tintColor={BRAND} />}
      >
        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 350 }}>
          <View style={{ paddingTop: 24, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Study</Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Track progress and practise papers.</Text>
            </View>
            <Pressable
              onPress={() => router.push("/study/new" as never)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Study new paper</Text>
            </Pressable>
          </View>
        </MotiView>

        {loading ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : (
          <>
            {/* Stats */}
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 350, delay: 60 }}>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <StatCard
                  icon={TaskDaily01Icon}
                  label="Papers done"
                  value={data?.sessionsCompleted ?? 0}
                  sub={`of ${data?.sessionsStarted ?? 0} started`}
                />
                <StatCard
                  icon={TrendUp01Icon}
                  label="Completion"
                  value={`${data?.passRate ?? 0}%`}
                  sub="sessions finished"
                />
              </View>
              <View style={{ marginBottom: 28 }}>
                <StatCard
                  icon={CheckmarkCircle01Icon}
                  label="Questions answered"
                  value={data?.totalQuestionsAnswered ?? 0}
                  sub="across all sessions"
                />
              </View>
            </MotiView>

            {/* Recent sessions */}
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 350, delay: 120 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 12 }}>Recent sessions</Text>

              {!data?.sessions.length ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10, backgroundColor: "#F9FAFB", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6" }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                    <HugeiconsIcon icon={GraduationScrollIcon} size={24} color="#A5B4FC" />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>No sessions yet</Text>
                  <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 20 }}>
                    Start your first session to track your progress.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/study/new" as never)}
                    style={{ marginTop: 4, backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Study new paper</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {data.sessions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => router.push(`/papers/${s.paperId}` as never)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#F3F4F6",
                        padding: 14,
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <HugeiconsIcon icon={TaskDaily01Icon} size={18} color={BRAND} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={1}>{s.paperTitle}</Text>
                          <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.subject} · {timeAgo(s.completedAt)}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <View style={{ backgroundColor: s.mode === "GUIDE" ? "#EEF2FF" : "#F3F4F6", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: s.mode === "GUIDE" ? BRAND : "#6B7280" }}>{s.mode}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{s.questionsAnswered}q</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </MotiView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
