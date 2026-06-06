import { ArrowLeft, CheckCircle, DownloadSimple, File, Image, Sparkle } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import RNBlobUtil from "react-native-blob-util";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Toast, useToast } from "@/components/ui/toast";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { env } from "@pass/env/native";
import { Button } from "@/components/ui/button";
import { PdfViewerModal } from "@/components/pdf-viewer";
import { FormattedQuestionText } from "@/lib/format-question";

const BRAND = "#4F46E5";

/**
 * Renders AI markdown responses in React Native.
 *
 * Supports: # / ## / ### headings, **bold**, *italic*,
 *   - / * / • bullet lists, 1. numbered lists, blank-line paragraph breaks.
 * Matches the web MarkdownContent component's feature set.
 */
function InlineText({ text, color = "#1E293B", baseSize = 13 }: { text: string; color?: string; baseSize?: number }) {
  // Split on **bold**, *italic*, `code` spans
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  return (
    <Text>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <Text key={i} style={{ fontWeight: "700", fontSize: baseSize, color }}>{part.slice(2, -2)}</Text>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <Text key={i} style={{ fontStyle: "italic", fontSize: baseSize, color }}>{part.slice(1, -1)}</Text>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <Text key={i} style={{ fontFamily: "monospace", fontSize: baseSize - 1, color: BRAND, backgroundColor: "#EEF2FF" }}>{part.slice(1, -1)}</Text>;
        return <Text key={i} style={{ fontSize: baseSize, color }}>{part}</Text>;
      })}
    </Text>
  );
}

function RenderMarkdown({ text, color = "#1E293B" }: { text: string; color?: string }) {
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let numberedBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (!bulletBuffer.length) return;
    bulletBuffer.forEach((item) => {
      elements.push(
        <View key={key++} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND, marginTop: 8, flexShrink: 0 }} />
          <InlineText text={item} color={color} />
        </View>,
      );
    });
    bulletBuffer = [];
  }

  function flushNumbered() {
    if (!numberedBuffer.length) return;
    numberedBuffer.forEach((item, idx) => {
      elements.push(
        <View key={key++} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
          <Text style={{ fontSize: 13, color: BRAND, fontWeight: "600", minWidth: 18 }}>{idx + 1}.</Text>
          <InlineText text={item} color={color} />
        </View>,
      );
    });
    numberedBuffer = [];
  }

  for (const line of text.split("\n")) {
    // ── Headings ────────────────────────────────────────────────────────────
    if (/^#{3,}\s+/.test(line)) {
      flushBullets(); flushNumbered();
      elements.push(
        <Text key={key++} style={{ fontSize: 13, fontWeight: "700", color, marginTop: 10, marginBottom: 3 }}>
          {line.replace(/^#{3,}\s+/, "")}
        </Text>,
      );
    } else if (line.startsWith("## ")) {
      flushBullets(); flushNumbered();
      elements.push(
        <Text key={key++} style={{ fontSize: 15, fontWeight: "700", color, marginTop: 12, marginBottom: 4 }}>
          {line.slice(3)}
        </Text>,
      );
    } else if (line.startsWith("# ")) {
      flushBullets(); flushNumbered();
      elements.push(
        <Text key={key++} style={{ fontSize: 16, fontWeight: "700", color, marginTop: 14, marginBottom: 4 }}>
          {line.slice(2)}
        </Text>,
      );
    // ── * bullet ──────────────────────────────────────────────────────────
    } else if (/^\*\s+/.test(line)) {
      flushNumbered();
      bulletBuffer.push(line.replace(/^\*\s+/, ""));
    // ── - or • bullet ──────────────────────────────────────────────────────
    } else if (/^[-•]\s+/.test(line)) {
      flushNumbered();
      bulletBuffer.push(line.replace(/^[-•]\s+/, ""));
    // ── Numbered list ───────────────────────────────────────────────────────
    } else if (/^\d+\.\s+/.test(line)) {
      flushBullets();
      numberedBuffer.push(line.replace(/^\d+\.\s+/, ""));
    // ── Blank line → paragraph break ───────────────────────────────────────
    } else if (line.trim() === "") {
      flushBullets(); flushNumbered();
      elements.push(<View key={key++} style={{ height: 8 }} />);
    // ── Plain text paragraph ────────────────────────────────────────────────
    } else {
      flushBullets(); flushNumbered();
      elements.push(
        <View key={key++} style={{ marginBottom: 2 }}>
          <InlineText text={line} color={color} />
        </View>,
      );
    }
  }
  flushBullets(); flushNumbered();
  return <>{elements}</>;
}
const API = env.EXPO_PUBLIC_SERVER_URL;

interface Question {
  id: string;
  questionNumber: number;
  text: string;
  marks: number;
  section?: string | null;
  topic?: string | null;
  pdfPage?: number | null;
  hasDiagram?: boolean;
  diagramNote?: string | null;
  guideSource?: "AI_GENERATED" | "OFFICIAL";
}

interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  year: number;
  fileUrl?: string;
}

type Mode = "GUIDE" | "FREE";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={{ height: 5, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: BRAND, borderRadius: 3 }} />
    </View>
  );
}

export default function PaperSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("GUIDE");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [aiResponses, setAiResponses] = useState<Record<number, string>>({});
  const [streaming, setStreaming] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);

  const [pdfVisible, setPdfVisible] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const { toastState, show: showToast } = useToast();

  const scrollRef = useRef<ScrollView>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const [startError, setStartError] = useState<string | null>(null);

  const pdfUri = paper?.fileUrl ? `${API}${paper.fileUrl}` : "";
  function openPdf(page = 1) {
    setPdfPage(page);
    setPdfVisible(true);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/papers/${id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setPaper(d.paper ?? null);
        setQuestions(d.questions ?? []);
      })
      .catch((err) => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    const token = await SecureStore.getItemAsync("pass_access_token");
    try {
      const res = await fetch(`${API}/papers/${id}/session/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      setSessionId(data.session?.id ?? null);
      setStarted(true);
    } catch (err) {
      setStartError((err as Error).message ?? "Failed to start session. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!sessionId) return;
    const q = questions[currentIndex];
    if (!q) return;

    setStreaming(true);
    setAiResponses((prev) => ({ ...prev, [q.questionNumber]: "" }));

    const token = await SecureStore.getItemAsync("pass_access_token");
    const body: Record<string, unknown> = {
      questionNumber: q.questionNumber,
      questionText: q.text,
      mode,
    };
    if (mode === "GUIDE") body.userAnswer = answers[q.questionNumber] ?? "";

    try {
      const res = await fetch(`${API}/papers/session/${sessionId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const chunk = line.slice(5).trim();
            if (chunk) {
              setAiResponses((prev) => ({
                ...prev,
                [q.questionNumber]: (prev[q.questionNumber] ?? "") + chunk,
              }));
              if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(() =>
                scrollRef.current?.scrollToEnd({ animated: false })
              );
            }
          }
        }
      }
    } catch (err) {
      setAiResponses((prev) => ({
        ...prev,
        [q.questionNumber]: "Failed to get AI response. Please try again.",
      }));
    } finally {
      setStreaming(false);
      setCompleted((prev) => new Set([...prev, q.questionNumber]));
    }
  }

  async function handleDownload() {
    const token = await SecureStore.getItemAsync("pass_access_token");
    if (!token) {
      showToast("error", "Sign in required to download papers.");
      return;
    }
    setDownloading(true);
    try {
      const { DocumentDir } = RNBlobUtil.fs.dirs;

      // Create Pass/Papers directory hierarchy
      const passDir = `${DocumentDir}/Pass`;
      const papersDir = `${passDir}/Papers`;
      if (!(await RNBlobUtil.fs.isDir(passDir))) await RNBlobUtil.fs.mkdir(passDir);
      if (!(await RNBlobUtil.fs.isDir(papersDir))) await RNBlobUtil.fs.mkdir(papersDir);

      const safeTitle = (paper?.title ?? "paper").replace(/[^a-zA-Z0-9\-_. ]/g, "_").slice(0, 60);
      const filename = `${safeTitle}.pdf`;
      const filePath = `${papersDir}/${filename}`;

      console.log("[download-paper] fetching", `${API}/papers/${id}/download`);
      const response = await RNBlobUtil
        .config({ path: filePath, overwrite: true })
        .fetch("GET", `${API}/papers/${id}/download`, {
          Authorization: `Bearer ${token}`,
        });

      const status = response.respInfo.status;
      console.log("[download-paper] status", status, "path", filePath);

      if (status !== 200) {
        const text = await Promise.resolve(response.text());
        await RNBlobUtil.fs.unlink(filePath).catch(() => {});
        let errObj: { error?: string; limitReached?: boolean } = {};
        try { errObj = JSON.parse(text as string); } catch { /* */ }
        showToast("error", errObj.limitReached
          ? "Download limit reached — upgrade your plan for more."
          : (errObj.error ?? `Download failed (${status}).`));
        return;
      }

      showToast("success", `Saved to Pass/Papers/${filename}`);
    } catch (err) {
      console.warn("[download-paper] error:", err);
      showToast("error", "Failed to download. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    const token = await SecureStore.getItemAsync("pass_access_token");
    await fetch(`${API}/papers/session/${sessionId}/complete`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).catch(console.error);
    setSessionComplete(true);
  }

  const currentQ = questions[currentIndex];
  const answeredCount = completed.size;
  const totalQ = questions.length;
  const allDone = answeredCount >= totalQ && totalQ > 0;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  if (sessionComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={32} color="#16A34A" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center" }}>Session complete!</Text>
          <Text style={{ fontSize: 15, color: "#6B7280", textAlign: "center" }}>
            You answered {answeredCount} of {totalQ} questions.
          </Text>
          <Button onPress={() => router.back()} className="mt-2 rounded-[12px]">
            Back to resources
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <Toast visible={toastState.visible} variant={toastState.variant} message={toastState.message} />
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color="#6B7280" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }} numberOfLines={1}>
            {paper?.title ?? "Session"}
          </Text>
          {paper && (
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
              {paper.subject} · {paper.grade}
            </Text>
          )}
        </View>
        {pdfUri !== "" && (
          <Pressable
            onPress={() => openPdf(1)}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "#EEF2FF",
              borderRadius: 9,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <File size={14} color={BRAND} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: BRAND }}>Paper</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleDownload}
          disabled={downloading}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: downloading ? "#E5E7EB" : "#F0FDF4",
            borderRadius: 9,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          {downloading
            ? <ActivityIndicator size="small" color="#6B7280" />
            : <DownloadSimple size={14} color="#16A34A" />
          }
          <Text style={{ fontSize: 12, fontWeight: "600", color: downloading ? "#6B7280" : "#16A34A" }}>
            {downloading ? "…" : "Download"}
          </Text>
        </Pressable>
      </View>

      {/* Original-paper PDF viewer */}
      <PdfViewerModal
        visible={pdfVisible}
        onClose={() => setPdfVisible(false)}
        uri={pdfUri}
        page={pdfPage}
        title={paper?.title}
      />

      {/* Progress bar */}
      {started && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{answeredCount}/{totalQ} answered</Text>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0}%</Text>
          </View>
          <ProgressBar value={answeredCount} max={totalQ} />
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode selector + start */}
        {!started && (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 }}>Choose your mode</Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>You cannot change this once you start.</Text>
            </View>

            {/* Mode toggle */}
            <View style={{ flexDirection: "row", borderRadius: 12, borderWidth: 2, borderColor: "#E5E7EB", overflow: "hidden", gap: 1, backgroundColor: "#FFFFFF" }}>
              {(["GUIDE", "FREE"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: mode === m ? BRAND : "#FFFFFF",
                    borderRadius: mode === m ? 10 : 0,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: mode === m ? "#FFFFFF" : "#6B7280", paddingHorizontal: 8 }}>
                    {m === "GUIDE" ? "Guide" : "Free"}
                  </Text>
                  <Text style={{ fontSize: 11, color: mode === m ? "rgba(255,255,255,0.85)" : "#9CA3AF", marginTop: 3, textAlign: "center", paddingHorizontal: 12, lineHeight: 16 }}>
                    {m === "GUIDE" ? "Answer +\nget feedback" : "See full\nsolution"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {startError && (
              <View style={{ backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 13, color: "#DC2626" }}>{startError}</Text>
              </View>
            )}
            <Button onPress={handleStart} loading={starting} className="rounded-[12px]">
              Start session
            </Button>
          </View>
        )}

        {/* Active session */}
        {started && currentQ && (
          <View style={{ gap: 16 }}>
            {/* Question navigator */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {questions.map((q, i) => {
                const isDone = completed.has(q.questionNumber);
                const isActive = i === currentIndex;
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => setCurrentIndex(i)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDone ? "#ECFDF5" : isActive ? "#EEF2FF" : "#F9FAFB",
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isDone ? "#10B981" : isActive ? BRAND : "#E5E7EB",
                    }}
                  >
                    {isDone ? (
                      <CheckCircle size={18} color="#10B981" />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: "700", color: isActive ? BRAND : "#6B7280" }}>
                        {q.questionNumber}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Question card */}
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "500" }}>
                  Question {currentQ.questionNumber} · {currentQ.marks} mark{currentQ.marks !== 1 ? "s" : ""}
                </Text>
                <View style={{ backgroundColor: "#EEF2FF", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, color: BRAND, fontWeight: "600" }}>{mode === "GUIDE" ? "Guide" : "Free"}</Text>
                </View>
              </View>
              <FormattedQuestionText text={currentQ.text} />

              {/* Diagram-dependent question — link to the original PDF page */}
              {currentQ.hasDiagram && (
                <Pressable
                  onPress={() => openPdf(currentQ.pdfPage ?? 1)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 12,
                    backgroundColor: "#FEF3C7",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <Image size={16} color="#B45309" />
                  <Text style={{ flex: 1, fontSize: 12, color: "#92400E", lineHeight: 17 }}>
                    {currentQ.diagramNote
                      ? `Refers to a figure: ${currentQ.diagramNote}. Tap to view the original paper.`
                      : "This question refers to a figure. Tap to view the original paper."}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Guide: answer input */}
            {mode === "GUIDE" && !completed.has(currentQ.questionNumber) && (
              <View style={{ gap: 10 }}>
                <TextInput
                  placeholder="Write your answer here…"
                  placeholderTextColor="#9CA3AF"
                  value={answers[currentQ.questionNumber] ?? ""}
                  onChangeText={(t) => setAnswers((prev) => ({ ...prev, [currentQ.questionNumber]: t }))}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                    color: "#111827",
                    minHeight: 100,
                    backgroundColor: "#FFFFFF",
                  }}
                />
                <Button
                  onPress={handleSubmit}
                  disabled={streaming || !answers[currentQ.questionNumber]?.trim()}
                  size="sm"
                  className="rounded-[12px]"
                >
                  <Sparkle size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", marginLeft: 6 }}>
                    {streaming ? "Getting feedback…" : "Submit Answer"}
                  </Text>
                </Button>
              </View>
            )}

            {/* Free: get answer button */}
            {mode === "FREE" && !completed.has(currentQ.questionNumber) && (
              <Button
                onPress={handleSubmit}
                disabled={streaming}
                size="sm"
                className="rounded-[12px]"
              >
                <Sparkle size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF", marginLeft: 6 }}>
                  {streaming ? "Loading answer…" : "Get Answer"}
                </Text>
              </Button>
            )}

            {/* AI response */}
            {(aiResponses[currentQ.questionNumber] || streaming) && (
              <View style={{ backgroundColor: "#EEF2FF", borderRadius: 12, borderWidth: 1, borderColor: `${BRAND}30`, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Sparkle size={15} color={BRAND} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND }}>
                    AI {mode === "GUIDE" ? "Feedback" : "Solution"}
                  </Text>
                  {streaming && <ActivityIndicator size="small" color={BRAND} style={{ marginLeft: 4 }} />}
                  {mode === "GUIDE" && !streaming && (
                    <Text
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontWeight: "600",
                        color: currentQ.guideSource === "OFFICIAL" ? "#16A34A" : "#9CA3AF",
                      }}
                    >
                      {currentQ.guideSource === "OFFICIAL"
                        ? "Official marking scheme"
                        : "AI-estimated marking"}
                    </Text>
                  )}
                </View>
                <RenderMarkdown text={aiResponses[currentQ.questionNumber] ?? ""} color="#1E293B" />
              </View>
            )}

            {/* Previous / Next navigation */}
            {completed.has(currentQ.questionNumber) && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                {currentIndex > 0 && (
                  <Button
                    onPress={() => setCurrentIndex((i) => i - 1)}
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-[12px]"
                  >
                    Previous
                  </Button>
                )}
                {currentIndex < questions.length - 1 ? (
                  <Button
                    onPress={() => setCurrentIndex((i) => i + 1)}
                    size="sm"
                    className="flex-1 rounded-[12px]"
                  >
                    Next
                  </Button>
                ) : allDone ? (
                  <Button
                    onPress={handleComplete}
                    variant="success"
                    size="sm"
                    className="flex-1 rounded-[12px]"
                  >
                    Complete session
                  </Button>
                ) : null}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
