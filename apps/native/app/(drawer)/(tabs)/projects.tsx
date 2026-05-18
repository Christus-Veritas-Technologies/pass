import {
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Folder01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as SecureStore from "expo-secure-store";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

const SUBJECTS = [
  "Mathematics", "English Language", "Combined Science", "Chemistry",
  "Biology", "History", "Geography", "English Literature", "Shona", "Physics",
];
const GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"];

interface Project {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);

  // Form
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade]     = useState(GRADES[3]);
  const [topic, setTopic]     = useState("");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [genError, setGenError]     = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function getToken() {
    try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
  }

  async function fetchProjects(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const token = await getToken();
    try {
      const res = await fetch(`${API}/projects`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchProjects(); }, []);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setStreamedContent("");
    setGenError("");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = await getToken();
      const res = await fetch(`${API}/projects/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject, grade, topic: topic.trim() }),
        signal: abort.signal,
      });

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: done")) {
            await fetchProjects();
            break;
          }
          if (line.startsWith("event: error")) {
            setGenError("AI generation failed. Please try again.");
          }
          if (line.startsWith("data: ")) {
            const chunk = line.slice(6);
            if (!chunk.startsWith("proj_")) {
              setStreamedContent((prev) => prev + chunk);
            }
          }
        }
      }

      setShowModal(false);
      setTopic("");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setGenError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function renderProject({ item }: { item: Project }) {
    return (
      <Pressable
        onPress={() => setSelected(item)}
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
          }}
        >
          <HugeiconsIcon icon={Folder01Icon} size={20} color={BRAND} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#111827" }} numberOfLines={1}>
            {item.topic}
          </Text>
          <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            {item.subject} · {item.grade} · {timeAgo(item.createdAt)}
          </Text>
        </View>
        <View style={{ backgroundColor: "#EEF2FF", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND }}>{item.grade}</Text>
        </View>
      </Pressable>
    );
  }

  // Markdown renderer (simple)
  function renderContent(content: string) {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return (
        <Text key={i} style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 4 }}>
          {line.slice(2)}
        </Text>
      );
      if (line.startsWith("## ")) return (
        <Text key={i} style={{ fontSize: 15, fontWeight: "600", color: "#111827", marginTop: 12, marginBottom: 4 }}>
          {line.slice(3)}
        </Text>
      );
      if (line.startsWith("### ")) return (
        <Text key={i} style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 2 }}>
          {line.slice(4)}
        </Text>
      );
      if (line.startsWith("- ") || line.startsWith("* ")) return (
        <Text key={i} style={{ fontSize: 13, color: "#374151", marginLeft: 12, marginBottom: 3, lineHeight: 20 }}>
          {"• "}{line.slice(2)}
        </Text>
      );
      if (line.trim() === "") return <View key={i} style={{ height: 6 }} />;
      const bold = line.replace(/\*\*([^*]+)\*\*/g, "«$1»");
      return (
        <Text key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 21, marginBottom: 2 }}>
          {bold.split("«").map((part, j) => {
            if (j === 0) return part;
            const [b, rest] = part.split("»");
            return [
              <Text key={`b${j}`} style={{ fontWeight: "700" }}>{b}</Text>,
              rest,
            ];
          })}
        </Text>
      );
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Projects</Text>
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>AI-generated study guides</Text>
        </View>
        <Pressable
          onPress={() => { setShowModal(true); setStreamedContent(""); setGenError(""); }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: BRAND,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <HugeiconsIcon icon={SparklesIcon} size={15} color="#FFFFFF" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Generate</Text>
        </Pressable>
      </View>

      {/* Projects list */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={renderProject}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProjects(true)}
              tintColor={BRAND}
            />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ alignItems: "center", paddingTop: 60, gap: 12 }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <HugeiconsIcon icon={Folder01Icon} size={28} color="#A5B4FC" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>No projects yet</Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", paddingHorizontal: 24 }}>
                Tap Generate to create your first AI study guide.
              </Text>
              <Pressable
                onPress={() => { setShowModal(true); setStreamedContent(""); setGenError(""); }}
                style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <HugeiconsIcon icon={SparklesIcon} size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Generate guide</Text>
              </Pressable>
            </MotiView>
          }
        />
      )}

      {/* Project viewer modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
                {selected?.topic}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>
                {selected?.subject} · {selected?.grade}
              </Text>
            </View>
            <Pressable onPress={() => setSelected(null)} style={{ padding: 8 }}>
              <HugeiconsIcon icon={Cancel01Icon} size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {selected && renderContent(selected.content)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Generate modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !generating && setShowModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            {/* Modal header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <HugeiconsIcon icon={SparklesIcon} size={18} color={BRAND} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Generate Study Guide</Text>
              </View>
              {!generating && (
                <Pressable onPress={() => setShowModal(false)} style={{ padding: 8 }}>
                  <HugeiconsIcon icon={Cancel01Icon} size={20} color="#6B7280" />
                </Pressable>
              )}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Subject picker */}
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 8, marginTop: 4 }}>SUBJECT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                {SUBJECTS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSubject(s)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: subject === s ? BRAND : "#F3F4F6",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: subject === s ? "#FFFFFF" : "#6B7280" }}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Grade picker */}
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 8 }}>GRADE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                {GRADES.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGrade(g)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: grade === g ? BRAND : "#E5E7EB",
                      backgroundColor: grade === g ? "#EEF2FF" : "#FFFFFF",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: grade === g ? BRAND : "#6B7280" }}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Topic input */}
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280", marginBottom: 8 }}>TOPIC</Text>
              <TextInput
                placeholder="e.g. Quadratic Equations"
                placeholderTextColor="#9CA3AF"
                value={topic}
                onChangeText={setTopic}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: "#111827",
                  marginBottom: 24,
                  backgroundColor: "#F9FAFB",
                }}
              />

              {genError ? (
                <Text style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{genError}</Text>
              ) : null}

              {/* Streamed content preview */}
              {generating && streamedContent ? (
                <View style={{ backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <HugeiconsIcon icon={SparklesIcon} size={14} color={BRAND} />
                    <Text style={{ fontSize: 12, color: BRAND, fontWeight: "500" }}>Writing…</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: "#374151", lineHeight: 20 }} numberOfLines={10}>
                    {streamedContent}
                  </Text>
                </View>
              ) : generating ? (
                <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
                  <ActivityIndicator size="large" color={BRAND} />
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>Generating your study guide…</Text>
                </View>
              ) : null}

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={handleGenerate}
                  disabled={generating || !topic.trim()}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: generating || !topic.trim() ? "#A5B4FC" : BRAND,
                    borderRadius: 12,
                    paddingVertical: 14,
                  }}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <HugeiconsIcon icon={SparklesIcon} size={16} color="#FFFFFF" />
                  )}
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>
                    {generating ? "Generating…" : "Generate"}
                  </Text>
                </Pressable>
                {generating && (
                  <Pressable
                    onPress={() => abortRef.current?.abort()}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                    }}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} color="#6B7280" />
                  </Pressable>
                )}
              </View>

              {!generating && streamedContent && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={16} color="#059669" />
                  <Text style={{ fontSize: 13, color: "#059669", fontWeight: "500" }}>Project saved to your list</Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
