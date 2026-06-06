import { ArrowDown, Folder, SealCheck, Sparkle, X } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import RNBlobUtil from "react-native-blob-util";
import { Toast, useToast } from "@/components/ui/toast";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "@/lib/theme-context";
import { env } from "@pass/env/native";
import { UpgradeModal } from "@/components/upgrade-modal";

const API = env.EXPO_PUBLIC_SERVER_URL;

const GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

// Normalise a subject string the same way the server does:
// lowercase → strip non-alphanumeric → collapse spaces → replace with "-"
function toSubjectKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().replace(/ /g, "-");
}

// Aliases (same as server lib/subjects.ts)
const SUBJECT_ALIASES: Record<string, string> = {
  "maths": "mathematics", "math": "mathematics",
  "english": "english-language", "lit": "literature-in-english", "literature": "literature-in-english",
  "combined": "combined-science", "phy": "physics", "phys": "physics",
  "chem": "chemistry", "bio": "biology", "agri": "agriculture", "agric": "agriculture",
  "geo": "geography", "geog": "geography", "hist": "history",
  "econ": "economics", "acc": "accounting", "accounts": "accounting",
  "cs": "computer-science", "it": "computer-science", "computing": "computer-science", "computer": "computer-science",
  "rme": "religious-and-moral-education", "religion": "religious-and-moral-education",
  "heritage": "heritage-studies", "food": "food-and-nutrition",
  "business": "business-studies", "pe": "physical-education",
  "environmental": "environmental-science", "soc": "sociology",
};

// Full flat ZIMSEC subject list (keys after normalisation)
const SUBJECT_KEYS = new Set([
  "mathematics","additional-mathematics","further-mathematics","statistics",
  "english-language","literature-in-english","shona","ndebele",
  "combined-science","physics","chemistry","biology","environmental-science","science",
  "agriculture","food-and-nutrition","food-science-and-technology",
  "history","geography","sociology","law","philosophy",
  "heritage-studies","religious-and-moral-education","religious-studies",
  "commerce","accounting","economics","business-studies","business-enterprise",
  "computer-science","technical-graphics","building-technology",
  "metal-technology","wood-technology","electrical-technology",
  "art","art-and-design","art-and-craft","music",
  "clothing-and-textiles","fashion-and-fabrics","home-economics",
  "physical-education",
]);

function isValidSubject(s: string): boolean {
  const key = toSubjectKey(s);
  return SUBJECT_KEYS.has(key) || SUBJECT_KEYS.has(SUBJECT_ALIASES[key] ?? "");
}

const SUBJECT_HINTS: Record<string, string> = {
  "Grade 7": "e.g. Mathematics, Heritage Studies, Science",
  "Form 4": "e.g. Mathematics, Biology, History, Chemistry, Geography",
  "Form 6": "e.g. Mathematics, Physics, Biology, Sociology, History",
};

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
  const router = useRouter();
  const { openModal } = useLocalSearchParams<{ openModal?: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { toastState, show: showToast } = useToast();

  // Step 1 form state
  const [step, setStep] = useState<1 | 2>(1);
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [centreNumber, setCentreNumber] = useState("");
  const [candidateNumber, setCandidateNumber] = useState("");
  const [grade, setGrade] = useState<string>(GRADES[1]);
  const [subject, setSubject] = useState<string>("");
  const [outline, setOutline] = useState<string>("");
  const [subjectError, setSubjectError] = useState<string>("");

  // Step 2 generation state
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [genDone, setGenDone] = useState(false);
  const [genError, setGenError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Upgrade modal
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState("FREE");

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

  // Open modal when navigated here with openModal=1 (e.g. from home quick action)
  useFocusEffect(useCallback(() => {
    if (openModal === "1" && !showModal) {
      openNewModal();
      router.setParams({ openModal: undefined });
    }
  }, [openModal])); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchProjects(); }, []);

  // Pre-fill session info when modal opens
  async function prefillFromSession() {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const u = data.user;
      if (u?.name) setStudentName(u.name);
      if (u?.school) setSchoolName(u.school);
      if (u?.grade && GRADES.includes(u.grade as typeof GRADES[number])) setGrade(u.grade);
    } catch {}
  }

  function openNewModal() {
    resetModal();
    prefillFromSession();
    setShowModal(true);
  }

  function handleGradeChange(g: string) {
    setGrade(g);
    // Clear subject hint-placeholder but keep any typed value; clear error
    setSubjectError("");
  }

  function resetModal() {
    setStep(1);
    setStudentName("");
    setSchoolName("");
    setCentreNumber("");
    setCandidateNumber("");
    setGrade(GRADES[1]);
    setSubject("");
    setOutline("");
    setSubjectError("");
    setStreamedContent("");
    setGenError("");
    setGenDone(false);
    setGenerating(false);
  }

  function validateSubject(): boolean {
    const s = subject.trim();
    if (!s) { setSubjectError("Subject is required."); return false; }
    if (!isValidSubject(s)) {
      setSubjectError("Subject not recognised. Try: Mathematics, Biology, Chemistry, History…");
      return false;
    }
    setSubjectError("");
    return true;
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
        body: JSON.stringify({ studentName, schoolName, centreNumber, candidateNumber, grade, subject, outline: outline.trim() || undefined }),
        signal: abort.signal,
      });

      if (res.status === 402) {
        const d = await res.json().catch(() => ({}));
        setUpgradePlan((d as { plan?: string }).plan ?? "FREE");
        setUpgradeVisible(true);
        return;
      }
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

  const canContinue = !!(grade && subject.trim());

  async function downloadPdf(project: Project) {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = await getToken();
      const { DocumentDir } = RNBlobUtil.fs.dirs;

      // Create Pass/Projects directory hierarchy
      const passDir = `${DocumentDir}/Pass`;
      const projectsDir = `${passDir}/Projects`;
      if (!(await RNBlobUtil.fs.isDir(passDir))) await RNBlobUtil.fs.mkdir(passDir);
      if (!(await RNBlobUtil.fs.isDir(projectsDir))) await RNBlobUtil.fs.mkdir(projectsDir);

      const safeTitle = project.topic.replace(/[^a-zA-Z0-9\-_. ]/g, "_").slice(0, 60);
      const filename = `${safeTitle}.pdf`;
      const filePath = `${projectsDir}/${filename}`;
      const pdfUrl = `${API}/projects/${project.id}/pdf`;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      console.log("[download-project] fetching", pdfUrl);
      let response = await RNBlobUtil
        .config({ path: filePath, overwrite: true })
        .fetch("GET", pdfUrl, headers);

      let status = response.respInfo.status;
      console.log("[download-project] status", status);

      if (status !== 200) {
        // PDF may still be generating — wait and retry once
        await new Promise<void>((r) => setTimeout(r, 3000));
        response = await RNBlobUtil
          .config({ path: filePath, overwrite: true })
          .fetch("GET", pdfUrl, headers);
        status = response.respInfo.status;
        if (status !== 200) {
          await RNBlobUtil.fs.unlink(filePath).catch(() => {});
          showToast("error", "PDF not ready yet — please try again in a moment.");
          return;
        }
      }

      showToast("success", `Saved to Pass/Projects/${filename}`);
    } catch (err: unknown) {
      console.warn("[download-project] error:", err);
      showToast("error", "Could not download the PDF. Please try again.");
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
      <Toast visible={toastState.visible} variant={toastState.variant} message={toastState.message} />
      <UpgradeModal
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        feature="projects"
        plan={upgradePlan}
      />
      {/* Header */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Projects</Text>
        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2, marginBottom: 14 }}>ZIMSEC Heritage-Based Curriculum projects</Text>
        <Pressable
          onPress={openNewModal}
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
                onPress={openNewModal}
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
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!generating) resetModal(); setShowModal(false); }}>
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
                <Pressable onPress={() => { if (!generating) resetModal(); setShowModal(false); }} style={{ padding: 8 }}>
                  <X size={20} color={colors.textTertiary} />
                </Pressable>
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

                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 6 }}>SUBJECT</Text>
                  <TextInput
                    placeholder={SUBJECT_HINTS[grade] ?? "e.g. Biology, Chemistry, History"}
                    placeholderTextColor={colors.textPlaceholder}
                    value={subject}
                    onChangeText={(v) => { setSubject(v); if (subjectError) setSubjectError(""); }}
                    style={{
                      borderWidth: 1,
                      borderColor: subjectError ? colors.error : colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: colors.text,
                      marginBottom: subjectError ? 4 : 20,
                      backgroundColor: colors.cardSubtle,
                    }}
                  />
                  {subjectError ? (
                    <Text style={{ fontSize: 12, color: colors.error, marginBottom: 16 }}>{subjectError}</Text>
                  ) : null}

                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textTertiary, marginBottom: 4 }}>
                    PROJECT OUTLINE <Text style={{ fontWeight: "400" }}>(optional)</Text>
                  </Text>
                  <TextInput
                    placeholder={"Paste your project outline, teacher guide, or any specific requirements here…\n\nLeave blank for a fully AI-structured project."}
                    placeholderTextColor={colors.textPlaceholder}
                    value={outline}
                    onChangeText={setOutline}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 13,
                      color: colors.text,
                      minHeight: 100,
                      marginBottom: 6,
                      backgroundColor: colors.cardSubtle,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 20, lineHeight: 16 }}>
                    When provided, the AI follows your outline strictly.
                  </Text>

                  <Pressable
                    onPress={() => {
                      if (validateSubject()) {
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
                      <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: "center", paddingHorizontal: 20 }}>
                        This takes 1–3 minutes. You can close this and we'll notify you when it's ready.
                      </Text>
                      <Pressable
                        onPress={() => { setShowModal(false); }}
                        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9, marginTop: 4 }}
                      >
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Generate in background</Text>
                      </Pressable>
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
