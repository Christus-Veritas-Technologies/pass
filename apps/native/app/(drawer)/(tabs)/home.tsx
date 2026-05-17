import {
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  FireIcon,
  TaskDaily01Icon,
  TrendUp01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4F46E5";

// Mock data — mirrors the backend API shape
const STATS = {
  papersAttempted: 12,
  questionsAnswered: 148,
  currentStreak: 5,
  weeklyGoal: 20,
  weeklyProgress: 14,
};

const RECENT_SESSIONS = [
  {
    id: "session_1",
    paperTitle: "Mathematics Paper 1 2023",
    subject: "Mathematics",
    score: 75,
    completedAt: "2 days ago",
  },
  {
    id: "session_2",
    paperTitle: "English Language Paper 2 2022",
    subject: "English Language",
    score: 60,
    completedAt: "4 days ago",
  },
  {
    id: "session_3",
    paperTitle: "Combined Science Paper 1 2023",
    subject: "Combined Science",
    score: 88,
    completedAt: "6 days ago",
  },
];

const FEATURED_RESOURCES = [
  { id: "res_1", title: "Mathematics Revision Notes", subject: "Mathematics", type: "Notes" },
  { id: "res_2", title: "English Essay Writing Guide", subject: "English Language", type: "Guide" },
  { id: "res_3", title: "Chemistry Periodic Table Flashcards", subject: "Chemistry", type: "Flashcards" },
];

function scoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#D97706";
  return "#DC2626";
}

function scoreBg(score: number): string {
  if (score >= 80) return "#ECFDF5";
  if (score >= 60) return "#FFFBEB";
  return "#FEF2F2";
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: BRAND, borderRadius: 3 }} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
            Dashboard
          </Text>
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
            Keep the streak going.
          </Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          {[
            { icon: TaskDaily01Icon, label: "Papers", value: String(STATS.papersAttempted) },
            { icon: CheckmarkCircle01Icon, label: "Questions", value: String(STATS.questionsAnswered) },
            { icon: FireIcon, label: "Streak", value: `${STATS.currentStreak}d` },
          ].map(({ icon, label, value }) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#F3F4F6",
                padding: 12,
              }}
            >
              <HugeiconsIcon icon={icon} size={16} color="#6B7280" />
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 6 }}>
                {value}
              </Text>
              <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly goal */}
        <View
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#F3F4F6",
            padding: 14,
            marginBottom: 28,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <HugeiconsIcon icon={TrendUp01Icon} size={15} color="#6B7280" />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280" }}>Weekly goal</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 4 }}>
            {STATS.weeklyProgress}
            <Text style={{ fontSize: 13, fontWeight: "400", color: "#9CA3AF" }}>
              /{STATS.weeklyGoal} questions
            </Text>
          </Text>
          <ProgressBar value={STATS.weeklyProgress} max={STATS.weeklyGoal} />
        </View>

        {/* Recent papers */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>Recent papers</Text>
            <Pressable onPress={() => router.push("/(drawer)/(tabs)/papers")}>
              <Text style={{ fontSize: 12, color: BRAND }}>View all</Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {RECENT_SESSIONS.map((s) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#F3F4F6",
                  padding: 14,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={1}>
                    {s.paperTitle}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {s.subject} · {s.completedAt}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: scoreBg(s.score),
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginLeft: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: scoreColor(s.score) }}>
                    {s.score}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Featured resources */}
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>Featured resources</Text>
            <Pressable onPress={() => router.push("/(drawer)/(tabs)/resources")}>
              <Text style={{ fontSize: 12, color: BRAND }}>View all</Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {FEATURED_RESOURCES.map((r) => (
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
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <HugeiconsIcon icon={BookOpen01Icon} size={18} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>
                    {r.subject} · {r.type}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
