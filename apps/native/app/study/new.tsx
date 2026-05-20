import { ArrowLeft, CaretLeft, CaretRight, CheckCircle, GraduationCap, Sparkle, Note } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;
const CACHE_TTL = 5 * 60 * 1000;
let paperCache: { data: Paper[]; ts: number } | null = null;

const SUBJECTS =["All", "Mathematics", "English Language", "Combined Science", "Chemistry", "Biology", "History", "Geography"];

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
}

async function getToken() {
  try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
}

function SubjectChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: active ? BRAND : "#F3F4F6", marginRight: 6,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "500", color: active ? "#FFFFFF" : "#6B7280" }}>{label}</Text>
    </Pressable>
  );
}

export default function StudyNewScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "prepare">("select");

  // Step 1
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Step 2
  const [brief, setBrief] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState("");

  useEffect(() => {
    if (paperCache && Date.now() - paperCache.ts < CACHE_TTL) {
      setPapers(paperCache.data);
      setLoadingPapers(false);
      return;
    }
    fetch(`${API}/papers`)
      .then((r) => r.json())
      .then((d) => {
        const list: Paper[] = d.papers ?? [];
        paperCache = { data: list, ts: Date.now() };
        setPapers(list);
      })
      .catch(() => setPapers([]))
      .finally(() => setLoadingPapers(false));
  }, []);

  const filtered = papers.filter((p) => {
    if (subject !== "All" && p.subject !== subject) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handlePrepare() {
    if (!selectedId) return;
    setStep("prepare");
    setPreparing(true);
    setPrepError("");
    const token = await getToken();
    try {
      const res = await fetch(`${API}/study/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paperId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Preparation failed");
      setBrief(data.brief ?? "");
    } catch (err: unknown) {
      setPrepError((err as Error).message ?? "Something went wrong");
    } finally {
      setPreparing(false);
    }
  }

  // ─── Step 1: Paper selector ───────────────────────────────────────────────

  if (step === "select") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={18} color="#374151" />
          </Pressable>
          <View>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", letterSpacing: -0.3 }}>Choose a paper</Text>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>Step 1 of 2 — select a paper to study</Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>1</Text>
          </View>
          <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB", marginHorizontal: 6 }} />
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "500", color: "#9CA3AF" }}>2</Text>
          </View>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search papers…"
            placeholderTextColor="#9CA3AF"
            style={{ backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: "#111827" }}
          />
        </View>

        {/* Subject chips */}
        <View style={{ paddingLeft: 20, marginBottom: 12 }}>
          <FlatList
            data={SUBJECTS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s}
            renderItem={({ item }) => (
              <SubjectChip label={item} active={subject === item} onPress={() => setSubject(item)} />
            )}
          />
        </View>

        {/* Papers list */}
        {loadingPapers ? (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 8 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                <GraduationCap size={32} color="#D1D5DB" />
                <Text style={{ fontSize: 13, color: "#9CA3AF" }}>No papers found</Text>
              </View>
            }
            renderItem={({ item: p }) => {
              const isSelected = selectedId === p.id;
              return (
                <Pressable
                  onPress={() => setSelectedId(isSelected ? null : p.id)}
                  style={{
                    backgroundColor: isSelected ? "#EEF2FF" : "#FFFFFF",
                    borderRadius: 12,
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? BRAND : "#F3F4F6",
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: isSelected ? BRAND : "#F3F4F6", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isSelected ? <CheckCircle size={17} color="#FFFFFF" /> : <Note size={17} color="#6B7280" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={2}>{p.title}</Text>
                    <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{p.subject} · {p.grade} · {p.year}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        {/* Continue button */}
        {selectedId && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
          >
            <Pressable
              onPress={handlePrepare}
              style={{ backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              <Sparkle size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Prepare session</Text>
            </Pressable>
          </MotiView>
        )}
      </SafeAreaView>
    );
  }

  // ─── Step 2: Mastra preparation ───────────────────────────────────────────

  const selectedPaper = papers.find((p) => p.id === selectedId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Step indicator */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 20, marginBottom: 32 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={13} color={BRAND} />
          </View>
          <View style={{ flex: 1, height: 1, backgroundColor: `${BRAND}60`, marginHorizontal: 6 }} />
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>2</Text>
          </View>
        </View>

        {preparing ? (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 20 }}
          >
            <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
              <MotiView
                from={{ opacity: 0.3, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.6 }}
                transition={{ type: "timing", duration: 1200, loop: true }}
                style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: `${BRAND}20` }}
              />
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <Sparkle size={28} color={BRAND} />
              </View>
            </View>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>Preparing your session</Text>
              <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                Pass AI is reviewing the paper and preparing your study brief…
              </Text>
            </View>
          </MotiView>
        ) : prepError ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Text style={{ fontSize: 13, color: "#EF4444", textAlign: "center" }}>{prepError}</Text>
            <Pressable
              onPress={() => { setStep("select"); setPrepError(""); }}
              style={{ backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Go back</Text>
            </Pressable>
          </View>
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ flex: 1 }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Ready to study</Text>
            {selectedPaper && (
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4, marginBottom: 20 }}>
                {selectedPaper.subject} · {selectedPaper.grade} · {selectedPaper.year}
              </Text>
            )}

            {/* AI brief */}
            <View style={{ backgroundColor: "#EEF2FF", borderRadius: 14, borderWidth: 1, borderColor: `${BRAND}30`, padding: 16, marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkle size={14} color={BRAND} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND }}>Pass AI — Study Brief</Text>
              </View>
              <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }}>{brief}</Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => { setStep("select"); setBrief(""); }}
                style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
              >
                <ArrowLeft size={15} color="#374151" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Change paper</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/papers/${selectedId}` as never)}
                style={{ flex: 2, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
              >
                <Note size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>Begin session</Text>
              </Pressable>
            </View>
          </MotiView>
        )}
      </View>
    </SafeAreaView>
  );
}
