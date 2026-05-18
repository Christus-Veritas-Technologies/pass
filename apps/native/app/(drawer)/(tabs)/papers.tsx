import {
  BookOpen01Icon,
  Calendar01Icon,
  ChevronRight01Icon,
  Search01Icon,
  TaskDaily01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;

const SUBJECT_FILTERS = [
  "All", "Mathematics", "English Language", "Combined Science",
  "Chemistry", "Biology", "History", "Geography",
];
const GRADE_FILTERS = ["All", "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
}

export default function PapersScreen() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [grade, setGrade] = useState("All");

  async function fetchPapers(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API}/papers`);
      const data = await res.json();
      setPapers(data.papers ?? []);
    } catch {
      setPapers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchPapers(); }, []);

  const filtered = papers.filter((p) => {
    if (subject !== "All" && p.subject !== subject) return false;
    if (grade !== "All" && p.grade !== grade) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function renderPaper({ item }: { item: Paper }) {
    return (
      <Pressable
        onPress={() => router.push(`/papers/${item.id}` as never)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        })}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "#EEF2FF",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HugeiconsIcon icon={TaskDaily01Icon} size={20} color={BRAND} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 13, fontWeight: "500", color: "#111827" }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: "#6B7280" }}>{item.subject}</Text>
            <Text style={{ fontSize: 11, color: "#D1D5DB" }}>·</Text>
            <Text style={{ fontSize: 11, color: "#6B7280" }}>{item.grade}</Text>
            <Text style={{ fontSize: 11, color: "#D1D5DB" }}>·</Text>
            <HugeiconsIcon icon={Calendar01Icon} size={11} color="#9CA3AF" />
            <Text style={{ fontSize: 11, color: "#6B7280" }}>{item.year}</Text>
          </View>
        </View>

        <HugeiconsIcon icon={ChevronRight01Icon} size={16} color="#9CA3AF" />
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
          Past Papers
        </Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
          Practise with guided AI marking or free mode.
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F9FAFB",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            paddingHorizontal: 12,
            height: 42,
            marginTop: 14,
            gap: 8,
          }}
        >
          <HugeiconsIcon icon={Search01Icon} size={16} color="#9CA3AF" />
          <TextInput
            placeholder="Search papers…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 14, color: "#111827" }}
          />
        </View>

        {/* Subject filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {SUBJECT_FILTERS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSubject(s)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: subject === s ? BRAND : "#F3F4F6",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: subject === s ? "#FFFFFF" : "#6B7280" }}>
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Grade filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {GRADE_FILTERS.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGrade(g)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: grade === g ? BRAND : "#E5E7EB",
                backgroundColor: grade === g ? "#EEF2FF" : "#FFFFFF",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: grade === g ? BRAND : "#6B7280" }}>
                {g}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={renderPaper}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPapers(true)}
              tintColor={BRAND}
            />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 300 }}
              style={{ alignItems: "center", paddingTop: 60, gap: 12 }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <HugeiconsIcon icon={BookOpen01Icon} size={28} color="#A5B4FC" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>No papers found</Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 24 }}>
                {search.trim() ? `No results for "${search}"` : "Try adjusting your subject or grade filters."}
              </Text>
            </MotiView>
          }
        />
      )}
    </SafeAreaView>
  );
}
