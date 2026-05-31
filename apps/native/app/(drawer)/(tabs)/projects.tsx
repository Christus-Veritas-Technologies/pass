import { ArrowDown, Folder, SealCheck, Sparkle, X } from "@vuduc0801/react-native-phosphor-icons";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAppTheme } from "@/lib/theme-context";
import { env } from "@pass/env/native";

const API = env.EXPO_PUBLIC_SERVER_URL;

const GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "Grade 7": ["Heritage Studies", "Mathematics", "English", "Science", "Shona/Ndebele"],
  "Form 4": ["History", "Combined Science", "Agriculture", "Biology", "Chemistry", "Geography", "Shona", "English Literature"],
  "Form 6": ["History", "Geography", "Sociology", "Agriculture", "Biology", "Chemistry", "Physics"],
};

const CATEGORIES = [
  { id: "Culture & History", emoji: "🏺", title: "Culture & History", desc: "Totems, liberation struggle, customs, languages" },
  { id: "Indigenous Sciences", emoji: "🌿", title: "Indigenous Sciences", desc: "Traditional medicine, farming, energy systems" },
  { id: "Arts & Lifestyle", emoji: "🎭", title: "Arts & Lifestyle", desc: "Music, architecture, food, traditional games" },
] as const;

interface Project {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  category: string;
  content: string;
  studentName: string;
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
  const { colors } = useAppTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Step 1 form state
  const [step, setStep] = useState<1 | 2>(1);
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [centreNumber, setCentreNumber] = useState("");
  const [candidateNumber, setCandidateNumber] = useState("");
  const [grade, setGrade] = useState<string>(GRADES[1]);
  const [subject, setSubject] = useState<string>(SUBJECTS_BY_GRADE["Form 4"][0]);
  const [category, setCategory] = useState<string>("");
  const [isGroupProject, setIsGroupProject] = useState(false);

  // Step 2 generation state
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [genDone, setGenDone] = useState(false);
  const [genError, setGenError] = useState("");
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

  function handleGradeChange(g: string) {
    setGrade(g);
    setSubject(SUBJECTS_BY_GRADE[g][0]);
  }

  function resetModal() {
    setStep(1);
    setStudentName("");
    setSchoolName("");
    setCentreNumber("");
    setCandidateNumber("");
    setGrade(GRADES[1]);
    setSubject(SUBJECTS_BY_GRADE["Form 4"][0]);
    setCategory("");
    setIsGroupProject(false);
    setStreamedContent("");
    setGenError("");
    setGenDone(false);
    setGenerating(false);
  }

  async function startGeneration() {
    setGenerating(true);
    setStreamedContent("");
    setGenError("");
    setGenDone(false);

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
        body: JSON.stringify({ studentName, schoolName, centreNumber, candidateNumber, grade, subject, category, isGroupProject }),
        signal: abort.signal,
      });

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (currentEvent === "chunk") {
              setStreamedContent((prev) => prev + data);
            } else if (currentEvent === "done") {
              setGenDone(true);
              await fetchProjects();
              break;
            } else if (currentEvent === "error") {
              setGenError("AI generation failed. Please try again.");
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setGenError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  const canContinue = !!(grade && subject);

  async function downloadPdf(project: Project) {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = await getToken();
      const pdfUrl = `${API}/projects/${project.id}/pdf${token ? `?token=${token}` : ""}`;
      const localPath = `${(FileSystem as { cacheDirectory?: string }).cacheDirectory ?? ""}project_${project.id}.pdf`;
      const result = await FileSystem.downloadAsync(pdfUrl, localPath, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (result.status !== 200) throw new Error("PDF not available");
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: project.topic,
      });
    } catch {
      Alert.alert("Download failed", "Could not download the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function renderContent(content: string) {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return (
        <Text key={i} style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 8, marginBottom: 4 }}>
          {line.slice(2)}
        </Text>
      );
      if (line.startsWith("## ")) return (
        <Text key={i} style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 12, marginBottom: 4 }}>
          {line.slice(3)}
        </Text>
      );
      if (line.startsWith("### ")) return (
        <Text key={i} style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 8, marginBottom: 2 }}>
          {line.slice(4)}
        </Text>
      );
      if (line.startsWith("- ") || line.startsWith("* ")) return (
        <Text key={i} style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 12, marginBottom: 3, lineHeight: 20 }}>
          {"• "}{line.slice(2)}
        </Text>
      );
      if (line.trim() === "") return <View key={i} style={{ height: 6 }} />;
      const bold = line.replace(/\*\*([^*]+)\*\*/g, "«$1»");
      return (
        <Text key={i} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 21, marginBottom: 2 }}>
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

  function renderProject({ item }: { item: Project }) {
    return (
      <Pressable
        onPress={() => setSelected(item)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.cardSubtle : colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        })}
      >
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
          <Folder size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }} numberOfLines={1}>
            {item.topic}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
            {item.subject} · {item.grade} · {timeAgo(item.createdAt)}
          </Text>
        </View>
        <View style={{ backgroundColor: colors.indigoBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.brand }}>
            {item.category || item.grade}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardSubtle }} edges={["top"]}>
      {/* Header */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Projects</Text>
        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2, marginBottom: 14 }}>ZIMSEC Heritage-Based Curriculum projects</Text>
        <Pressable
          onPress={() => { resetModal(); setShowModal(true); }}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 11 }}
        >
          <Sparkle size={15} color="#FFFFFF" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>New Project</Text>
        </Pressable>
      </View>

      {/* Projects list */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={renderProject}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchProjects(true)} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ alignItems: "center", paddingTop: 60, gap: 12 }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
                <Folder size={28} color={colors.brand} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>No projects yet</Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary, textAlign: "center", paddingHorizontal: 24 }}>
                Your generated HBC projects will appear here.
              </Text>
              <Pressable
                onPress={() => { resetModal(); setShowModal(true); }}
                style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Sparkle size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Start New Project</Text>
              </Pressable>
            </MotiView>
          }
        />
      )}

      {/* Project viewer modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {/* Use View (not SafeAreaView) so the modal sheet always has a defined height */}
        <View style={{ flex: 1, backgroundColor: colors.card }}>
          {/* Modal handle indicator */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }} numberOfLines={2}>
                {selected?.topic}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                {selected?.subject} · {selected?.grade}
              </Text>
            </View>
            {/* Download PDF */}
            <Pressable
              onPress={() => selected && downloadPdf(selected)}
              disabled={downloading}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8, opacity: downloading ? 0.5 : 1 }}
            >
              {downloading
                ? <ActivityIndicator size={14} color={colors.brand} />
                : <ArrowDown size={14} color={colors.brand} />
              }
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.brand }}>
                {downloading ? "…" : "PDF"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={{ padding: 8 }}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {selected?.content
              ? renderContent(selected.content)
              : (
                <View style={{ alignItems: "center", paddingTop: 60, gap: 8 }}>
                  <ActivityIndicator size="large" color={colors.brand} />
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>Loading content…</Text>
                </View>
              )
            }
          </ScrollView>
        </View>
      </Modal>

      {/* Generate modal — multi-step */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !generating && (resetModal(), setShowModal(false))}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            {/* Modal header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Sparkle size={18} color={colors.brand} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>New Project</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 12, color: colors.textTertiary }}>Step {step} of 2</Text>
                {!generating && (
                  <Pressable onPress={() => { resetModal(); setShowModal(false); }} style={{ padding: 8 }}>
                    <X size={20} color={colors.textTertiary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Step progress bar */}
            <View style={{ height: 3, backgroundColor: colors.borderSubtle }}>
              <View style={{ height: 3, backgroundColor: colors.brand, width: step === 1 ? "50%" : "100%" }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

              {/* ── Step 1: Candidate Information ─────────────────────────────── */}
              {step === 1 && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 6, marginTop: 4 }}>YOUR NAME <Text style={{ fontWeight: "400", color: colors.textTertiary }}>(optional)</Text></Text>
                  <TextInput
                    placeholder="e.g. Tendai Moyo"
                    placeholderTextColor={colors.textPlaceholder}
                    value={studentName}
                    onChangeText={setStudentName}
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: 16, backgroundColor: colors.cardSubtle }}
                  />

                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 6 }}>SCHOOL NAME <Text style={{ fontWeight: "400", color: colors.textTertiary }}>(optional)</Text></Text>
                  <TextInput
                    placeholder="e.g. Harare High School"
                    placeholderTextColor={colors.textPlaceholder}
                    value={schoolName}
                    onChangeText={setSchoolName}
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: 16, backgroundColor: colors.cardSubtle }}
                  />

                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 6 }}>CENTRE NO. <Text style={{ fontWeight: "400" }}>(optional)</Text></Text>
                      <TextInput
                        placeholder="e.g. 1234"
                        placeholderTextColor={colors.textPlaceholder}
                        value={centreNumber}
                        onChangeText={setCentreNumber}
                        keyboardType="numeric"
                        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, backgroundColor: colors.cardSubtle }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 6 }}>CANDIDATE NO. <Text style={{ fontWeight: "400" }}>(optional)</Text></Text>
                      <TextInput
                        placeholder="e.g. 5678"
                        placeholderTextColor={colors.textPlaceholder}
                        value={candidateNumber}
                        onChangeText={setCandidateNumber}
                        keyboardType="numeric"
                        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, backgroundColor: colors.cardSubtle }}
                      />
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 8 }}>GRADE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                    {GRADES.map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => handleGradeChange(g)}
                        style={{
                          paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
                          borderWidth: 1,
                          borderColor: grade === g ? colors.brand : colors.border,
                          backgroundColor: grade === g ? colors.indigoBg : colors.card,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: grade === g ? colors.brand : colors.textTertiary }}>
                          {g}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 8 }}>SUBJECT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                    {(SUBJECTS_BY_GRADE[grade] ?? []).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setSubject(s)}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: subject === s ? colors.brand : colors.borderSubtle }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "500", color: subject === s ? "#FFFFFF" : colors.textTertiary }}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 8 }}>CATEGORY</Text>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        borderWidth: 1,
                        borderColor: category === cat.id ? colors.brand : colors.border,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 10,
                        backgroundColor: category === cat.id ? colors.indigoBg : colors.card,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: category === cat.id ? colors.brand : colors.text }}>
                          {cat.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                          {cat.desc}
                        </Text>
                      </View>
                    </Pressable>
                  ))}

                  {/* Group project toggle */}
                  <Pressable
                    onPress={() => setIsGroupProject((v) => !v)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 4 }}
                  >
                    <View style={{
                      width: 20, height: 20, borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: isGroupProject ? colors.brand : colors.border,
                      backgroundColor: isGroupProject ? colors.brand : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {isGroupProject && <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>This is a group project</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (canContinue) {
                        setStep(2);
                        startGeneration();
                      }
                    }}
                    disabled={!canContinue}
                    style={{
                      marginTop: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: canContinue ? colors.brand : `${colors.brand}60`,
                      borderRadius: 12,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Continue</Text>
                  </Pressable>
                </>
              )}

              {/* ── Step 2: Generating ──────────────────────────────────────────── */}
              {step === 2 && (
                <>
                  {genError ? (
                    <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
                      <Text style={{ fontSize: 13, color: colors.error, textAlign: "center" }}>{genError}</Text>
                      <Pressable
                        onPress={() => setStep(1)}
                        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
                      >
                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: "500" }}>Try Again</Text>
                      </Pressable>
                    </View>
                  ) : genDone ? (
                    <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center" }}>
                        <SealCheck size={28} color={colors.success} />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Project Generated!</Text>
                      <Pressable
                        onPress={() => { resetModal(); setShowModal(false); }}
                        style={{ backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>Done</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
                      <ActivityIndicator size="large" color={colors.brand} />
                      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>Generating your project…</Text>
                      <Text style={{ fontSize: 12, color: colors.textTertiary }}>This takes about 30–60 seconds</Text>
                    </View>
                  )}

                  {streamedContent ? (
                    <View style={{ backgroundColor: colors.cardSubtle, borderRadius: 12, padding: 14, marginTop: 8 }}>
                      {generating && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                          <Sparkle size={14} color={colors.brand} />
                          <Text style={{ fontSize: 12, color: colors.brand, fontWeight: "500" }}>Writing…</Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }} numberOfLines={15}>
                        {streamedContent.slice(0, 600)}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
