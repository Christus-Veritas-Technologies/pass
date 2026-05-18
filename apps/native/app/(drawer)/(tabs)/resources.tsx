import {
  BookOpen01Icon,
  Download01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SkeletonCard } from "@/components/skeleton-block";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;

const TYPE_FILTERS = [
  { key: "All", label: "All" },
  { key: "PAST_PAPER", label: "Past Papers" },
  { key: "MARKING_GUIDE", label: "Marking Guides" },
  { key: "SYLLABUS", label: "Syllabi" },
];

const SUBJECT_FILTERS = [
  "All",
  "Mathematics",
  "English Language",
  "Combined Science",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Shona",
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PAST_PAPER: { bg: "#EEF2FF", text: BRAND },
  MARKING_GUIDE: { bg: "#ECFDF5", text: "#059669" },
  SYLLABUS: { bg: "#FFFBEB", text: "#D97706" },
};

interface Resource {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
  type: string;
  fileUrl: string;
}

export default function ResourcesScreen() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

  async function fetchResources(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const params = new URLSearchParams();
    if (typeFilter !== "All") params.set("type", typeFilter);
    if (subjectFilter !== "All") params.set("subject", subjectFilter);

    try {
      const res = await fetch(`${API}/resources?${params}`);
      const data = await res.json();
      setResources(data.resources ?? []);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchResources();
  }, [typeFilter, subjectFilter]);

  const filtered = search.trim()
    ? resources.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.subject.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  function renderResource({ item }: { item: Resource }) {
    const colors = TYPE_COLORS[item.type] ?? { bg: "#F3F4F6", text: "#6B7280" };
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          padding: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>
              {TYPE_FILTERS.find((t) => t.key === item.type)?.label ?? item.type}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{item.year}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#111827", marginBottom: 4 }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
          {item.subject} · {item.grade}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <HugeiconsIcon icon={Download01Icon} size={14} color={BRAND} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND }}>Download</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
          Resources
        </Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
          Past papers, marking guides, and syllabi.
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
            placeholder="Search resources…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 14, color: "#111827" }}
          />
        </View>

        {/* Type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {TYPE_FILTERS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTypeFilter(t.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: typeFilter === t.key ? BRAND : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: typeFilter === t.key ? "#FFFFFF" : "#6B7280",
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Subject filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {SUBJECT_FILTERS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSubjectFilter(s)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: subjectFilter === s ? BRAND : "#E5E7EB",
                backgroundColor: subjectFilter === s ? "#EEF2FF" : "#FFFFFF",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: subjectFilter === s ? BRAND : "#6B7280",
                }}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={renderResource}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchResources(true)}
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
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>No resources found</Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 24 }}>
                {search.trim() ? `No results for "${search}"` : "Try adjusting your type or subject filters."}
              </Text>
            </MotiView>
          }
        />
      )}
    </SafeAreaView>
  );
}
