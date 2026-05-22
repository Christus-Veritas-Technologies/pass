import { ArrowLeft, Sparkle, CaretDown, CaretUp } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { env } from "@pass/env/native";
import { useAppTheme } from "@/lib/theme-context";

const API = env.EXPO_PUBLIC_SERVER_URL;
const BRAND = "#4F46E5";

interface Attempt {
  id: string;
  questionNumber: number;
  questionText: string;
  userAnswer: string | null;
  explanation: string | null;
}

interface SessionDetail {
  id: string;
  mode: "GUIDE" | "FREE";
  questionsAnswered: number;
  completedAt: string | null;
  paper: {
    id: string;
    title: string;
    subject: string;
    grade: string;
    year: number;
  };
  attempts: Attempt[];
}

async function getToken() {
  try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function AttemptRow({ attempt, mode }: { attempt: Attempt; mode: "GUIDE" | "FREE" }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden", marginBottom: 10 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 14,
          backgroundColor: pressed ? "#F9FAFB" : "#FFFFFF",
        })}
      >
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: BRAND }}>{attempt.questionNumber}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 }} numberOfLines={open ? undefined : 2}>
          {attempt.questionText}
        </Text>
        {open ? <CaretUp size={14} color="#9CA3AF" /> : <CaretDown size={14} color="#9CA3AF" />}
      </Pressable>

      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", padding: 14, gap: 14 }}>
          {/* User's answer — Guide mode only */}
          {mode === "GUIDE" && attempt.userAnswer ? (
            <View>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>Your answer</Text>
              <View style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>{attempt.userAnswer}</Text>
              </View>
            </View>
          ) : null}

          {/* AI response */}
          {attempt.explanation ? (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Sparkle size={13} color={BRAND} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND }}>
                  AI {mode === "GUIDE" ? "Feedback" : "Solution"}
                </Text>
              </View>
              <View style={{ backgroundColor: "#EEF2FF", borderRadius: 10, borderWidth: 1, borderColor: `${BRAND}25`, padding: 12 }}>
                <Text style={{ fontSize: 13, color: "#1E293B", lineHeight: 20 }}>{attempt.explanation}</Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>No AI response recorded.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function SessionReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const token = await getToken();
      try {
        const res = await fetch(`${API}/papers/sessions/${sessionId}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error ?? "Failed to load session");
        }
        const d = await res.json();
        setSession(d.session);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message ?? "Failed to load");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontSize: 14, color: "#EF4444", textAlign: "center", paddingHorizontal: 32 }}>{error ?? "Session not found."}</Text>
          <Pressable onPress={() => router.back()} style={{ backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color="#6B7280" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>
            {session.paper.title}
          </Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
            {session.paper.subject} · {session.paper.grade}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={{ backgroundColor: "#EEF2FF", borderRadius: 14, borderWidth: 1, borderColor: `${BRAND}25`, padding: 16, marginBottom: 20, flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>{session.questionsAnswered}</Text>
            <Text style={{ fontSize: 11, color: "#6B7280" }}>questions answered</Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND }}>
              {session.mode === "GUIDE" ? "Guide" : "Free"} mode
            </Text>
            {session.completedAt && (
              <Text style={{ fontSize: 11, color: "#6B7280" }}>{timeAgo(session.completedAt)}</Text>
            )}
          </View>
          <Pressable
            onPress={() => router.push(`/papers/${session.paper.id}` as never)}
            style={{ marginLeft: "auto", backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#FFFFFF" }}>Study again</Text>
          </Pressable>
        </View>

        {/* Attempts */}
        {session.attempts.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>No question attempts recorded.</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              {session.attempts.length} question{session.attempts.length !== 1 ? "s" : ""}
            </Text>
            {session.attempts.map((a) => (
              <AttemptRow key={a.id} attempt={a} mode={session.mode} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
