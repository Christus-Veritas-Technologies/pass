import { CheckCircle, GraduationCap, Note, Play, TrendUp } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useAppTheme } from "@/lib/theme-context";
import { env } from "@pass/env/native";

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

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
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

function StatCard({ icon: Icon, label, value, sub, bg, border, iconColor, textColor }: {
  icon: any; label: string; value: string | number; sub?: string;
  bg: string; border: string; iconColor: string; textColor: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon size={14} color={iconColor} />
        <Text style={{ fontSize: 11, color: iconColor, fontWeight: "600" }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 26, fontWeight: "700", color: textColor }}>{value}</Text>
      {sub && <Text style={{ fontSize: 11, color: iconColor, marginTop: 2, opacity: 0.7 }}>{sub}</Text>}
    </View>
  );
}

export default function StudyScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [data, setData] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [papersLoading, setPapersLoading] = useState(true);

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

  useEffect(() => {
    fetchStats();
    fetch(`${API}/papers`)
      .then((r) => r.json())
      .then((d) => setPapers(d.papers ?? []))
      .catch(() => setPapers([]))
      .finally(() => setPapersLoading(false));
  }, []);

  const lastFetchRef = useRef(0);
  useFocusEffect(useCallback(() => {
    if (Date.now() - lastFetchRef.current < 30_000) return;
    lastFetchRef.current = Date.now();
    fetchStats();
  }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} tintColor={colors.brand} />}
      >
        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <View style={{ paddingTop: 24, paddingBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Study</Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>Track progress and practise papers.</Text>
          </View>
        </MotiView>

        {loading ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <>
            {/* Stats */}
            <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 220, delay: 50, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <StatCard
                  icon={Note}
                  label="Papers done"
                  value={data?.sessionsCompleted ?? 0}
                  sub={`of ${data?.sessionsStarted ?? 0} started`}
                  bg={colors.indigoBg}
                  border={colors.indigoBorder}
                  iconColor={colors.brand}
                  textColor={colors.text}
                />
                <StatCard
                  icon={TrendUp}
                  label="Completion"
                  value={`${data?.passRate ?? 0}%`}
                  sub="sessions finished"
                  bg={colors.greenBg}
                  border={colors.greenBorder}
                  iconColor={colors.success}
                  textColor={colors.text}
                />
              </View>
              <View style={{ marginBottom: 28 }}>
                <StatCard
                  icon={CheckCircle}
                  label="Questions answered"
                  value={data?.totalQuestionsAnswered ?? 0}
                  sub="across all sessions"
                  bg={colors.purpleBg}
                  border={colors.purpleBorder}
                  iconColor="#7C3AED"
                  textColor={colors.text}
                />
              </View>
            </MotiView>

            {/* Recent sessions */}
            <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 220, delay: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 12 }}>Recent sessions</Text>

              {!data?.sessions.length ? (
                <View style={{ alignItems: "center", paddingVertical: 36, gap: 8, backgroundColor: colors.cardSubtle, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSubtle }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
                    <GraduationCap size={24} color={colors.brand} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>No sessions yet</Text>
                  <Text style={{ fontSize: 13, color: colors.textTertiary, textAlign: "center", paddingHorizontal: 20 }}>
                    Pick a paper below to start your first session.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {data.sessions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => router.push(`/study/sessions/${s.id}` as never)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? colors.cardSubtle : colors.card,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14,
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Note size={18} color={colors.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }} numberOfLines={1}>{s.paperTitle}</Text>
                          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{s.subject} · {timeAgo(s.completedAt)}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <View style={{ backgroundColor: s.mode === "GUIDE" ? colors.indigoBg : colors.borderSubtle, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: s.mode === "GUIDE" ? colors.brand : colors.textTertiary }}>{s.mode}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.textTertiary }}>{s.questionsAnswered}q · Review →</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </MotiView>

            {/* Past papers */}
            <MotiView from={{ opacity: 0, translateY: 6, scale: 0.97 }} animate={{ opacity: 1, translateY: 0, scale: 1 }} transition={{ type: "timing", duration: 220, delay: 150, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 8, marginBottom: 12 }}>Past papers</Text>
              {papersLoading ? (
                <ActivityIndicator size="small" color={colors.brand} style={{ marginVertical: 20 }} />
              ) : papers.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 28, backgroundColor: colors.cardSubtle, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle }}>
                  <Note size={22} color={colors.textPlaceholder} />
                  <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>No papers available yet</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {papers.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/papers/${p.id}` as never)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? colors.cardSubtle : colors.card,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        padding: 14,
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <View style={{ backgroundColor: colors.indigoBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.brand }}>Past Paper</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textPlaceholder }}>{p.year}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 4 }} numberOfLines={2}>{p.title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: colors.textTertiary }}>{p.subject} · {p.grade}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Play size={12} color={colors.brand} />
                          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.brand }}>Study</Text>
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
