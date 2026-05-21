import { BookOpen, DownloadSimple, MagnifyingGlass } from "@vuduc0801/react-native-phosphor-icons";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
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
import { useAppTheme } from "@/lib/theme-context";
import { env } from "@pass/env/native";

const API = env.EXPO_PUBLIC_SERVER_URL;

const LEVEL_FILTERS = [
  { key: "All",     label: "All Levels" },
  { key: "A-Level", label: "A-Level" },
  { key: "O-Level", label: "O-Level" },
  { key: "Grade-7", label: "Grade 7" },
];

const TYPE_FILTERS = [
  { key: "All",           label: "All" },
  { key: "PAST_PAPER",    label: "Past Papers" },
  { key: "MARKING_GUIDE", label: "Marking Guides" },
  { key: "SYLLABUS",      label: "Syllabi" },
];

const SUBJECT_FILTERS = [
  "All", "Mathematics", "English Language", "Combined Science",
  "Chemistry", "Biology", "History", "Geography", "Shona", "Physics", "Accounting",
];

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
  const { colors } = useAppTheme();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

  const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    PAST_PAPER: { bg: colors.indigoBg, text: colors.brand },
    MARKING_GUIDE: { bg: colors.greenBg, text: colors.success },
    SYLLABUS: { bg: colors.warningBg, text: colors.warning },
  };

  async function fetchResources(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const params = new URLSearchParams();
    if (levelFilter !== "All") params.set("grade", levelFilter);
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
  }, [levelFilter, typeFilter, subjectFilter]);

  const filtered = search.trim()
    ? resources.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.subject.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  function renderResource({ item }: { item: Resource }) {
    const tc = TYPE_COLORS[item.type] ?? { bg: colors.borderSubtle, text: colors.textTertiary };
    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ backgroundColor: tc.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: tc.text }}>
              {TYPE_FILTERS.find((t) => t.key === item.type)?.label ?? item.type}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textPlaceholder }}>{item.year}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 4 }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 12 }}>
          {item.subject} · {item.grade}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <DownloadSimple size={14} color={colors.brand} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.brand }}>Download</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardSubtle }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>
          Resources
        </Text>
        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>
          Past papers, marking guides, and syllabi.
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.cardSubtle,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            height: 42,
            marginTop: 14,
            gap: 8,
          }}
        >
          <MagnifyingGlass size={16} color={colors.textPlaceholder} />
          <TextInput
            placeholder="Search resources…"
            placeholderTextColor={colors.textPlaceholder}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 14, color: colors.text }}
          />
        </View>

        {/* Level filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
          {LEVEL_FILTERS.map((l) => (
            <Pressable
              key={l.key}
              onPress={() => setLevelFilter(l.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: levelFilter === l.key ? colors.brand : colors.borderSubtle,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: levelFilter === l.key ? "#FFFFFF" : colors.textTertiary }}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
          {TYPE_FILTERS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTypeFilter(t.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: typeFilter === t.key ? colors.brand : colors.borderSubtle,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: typeFilter === t.key ? "#FFFFFF" : colors.textTertiary }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Subject filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
          {SUBJECT_FILTERS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSubjectFilter(s)}
              style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                borderWidth: 1,
                borderColor: subjectFilter === s ? colors.brand : colors.border,
                backgroundColor: subjectFilter === s ? colors.indigoBg : colors.card,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: subjectFilter === s ? colors.brand : colors.textTertiary }}>
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
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchResources(true)} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ alignItems: "center", paddingTop: 60, gap: 12 }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={28} color={colors.brand} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>No resources found</Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary, textAlign: "center", paddingHorizontal: 24 }}>
                {search.trim() ? `No results for "${search}"` : "Try adjusting your type or subject filters."}
              </Text>
            </MotiView>
          }
        />
      )}
    </SafeAreaView>
  );
}
