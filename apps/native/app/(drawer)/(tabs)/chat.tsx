import {
  ArrowLeft,
  Books,
  CaretRight,
  ChatCircleDots,
  FilePdf,
  FileText,
  Folder,
  House,
  Image as ImageIcon,
  Lightning,
  Paperclip,
  PaperPlaneRight,
  PencilSimple,
  Plus,
  Sparkle,
  Trash,
  X,
} from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image as RNImage,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/lib/theme-context";
import { env } from "@pass/env/native";
import { UpgradeModal } from "@/components/upgrade-modal";

const API = env.EXPO_PUBLIC_SERVER_URL;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

interface Attachment {
  kind: "upload" | "paper" | "session" | "resource" | "project";
  url?: string;
  refId?: string;
  mime?: string;
  name?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  pending?: boolean;
}

// ── In-app attachment sources (free context: papers, sessions, resources, projects) ──
type InAppTab = "paper" | "session" | "resource" | "project";
interface InAppItem { id: string; label: string; sub?: string }
interface RawRow {
  id?: string;
  title?: string;
  paperTitle?: string;
  topic?: string;
  subject?: string;
  grade?: string;
  year?: number;
  type?: string;
}
interface InAppSource {
  title: string;
  endpoint: string;
  key: string;
  filter?: (r: RawRow) => boolean;
  map: (r: RawRow) => InAppItem;
}

const IN_APP_SOURCES: Record<InAppTab, InAppSource> = {
  paper: {
    title: "Papers",
    endpoint: "/papers",
    key: "papers",
    map: (r) => ({ id: r.id ?? "", label: r.title ?? "Untitled", sub: [r.subject, r.grade, r.year].filter(Boolean).join(" · ") }),
  },
  session: {
    title: "Sessions",
    endpoint: "/papers/sessions/recent",
    key: "sessions",
    map: (r) => ({ id: r.id ?? "", label: r.paperTitle ?? "Practice session", sub: [r.subject, r.grade].filter(Boolean).join(" · ") }),
  },
  resource: {
    title: "Resources",
    endpoint: "/resources",
    key: "resources",
    filter: (r) => r.type !== "PAST_PAPER",
    map: (r) => ({ id: r.id ?? "", label: r.title ?? "Untitled", sub: [r.subject, r.grade].filter(Boolean).join(" · ") }),
  },
  project: {
    title: "Projects",
    endpoint: "/projects",
    key: "projects",
    map: (r) => ({ id: r.id ?? "", label: r.topic ?? "Project", sub: [r.subject, r.grade].filter(Boolean).join(" · ") }),
  },
};

const TAB_ICONS: Record<InAppTab, typeof Books> = {
  paper: Books,
  session: FileText,
  resource: Folder,
  project: Folder,
};

async function getToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync("pass_access_token"); } catch { return null; }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { colors } = useAppTheme();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [plan, setPlan] = useState("FREE");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Attachment menu (Photo / PDF / Attach from app) + in-app picker.
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [inAppOpen, setInAppOpen] = useState(false);
  const [inAppTab, setInAppTab] = useState<InAppTab>("paper");
  const [allInAppItems, setAllInAppItems] = useState<InAppItem[]>([]);
  const [inAppLoading, setInAppLoading] = useState(false);
  const [inAppSearch, setInAppSearch] = useState("");
  const [inAppDisplayCount, setInAppDisplayCount] = useState(20);

  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"aiMessages" | "attachments">("attachments");

  const listRef = useRef<FlatList<Message>>(null);
  const isPaid = plan !== "FREE";

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        if (d?.user?.plan) setPlan(d.user.plan);
      } catch {}
      loadThreads();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  useEffect(() => {
    if (!sendError) return;
    const t = setTimeout(() => setSendError(null), 4000);
    return () => clearTimeout(t);
  }, [sendError]);

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  async function loadThreads() {
    try {
      const res = await fetch(`${API}/chat/threads`, { headers: await authHeaders() });
      const data = await res.json();
      setThreads(data.threads ?? []);
      if (!activeId && data.threads?.length) selectThread(data.threads[0].id);
    } catch {}
  }

  async function selectThread(id: string) {
    setActiveId(id);
    setMessages([]);
    setThreadsOpen(false);
    try {
      const res = await fetch(`${API}/chat/threads/${id}/messages`, { headers: await authHeaders() });
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {}
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setPendingUploads([]);
    setInput("");
    setThreadsOpen(false);
    setAttachMenuOpen(false);
    setInAppOpen(false);
  }

  async function ensureThread(): Promise<string | null> {
    if (activeId) return activeId;
    try {
      const res = await fetch(`${API}/chat/threads`, { method: "POST", headers: await authHeaders(), body: "{}" });
      const thread = await res.json();
      setActiveId(thread.id);
      setThreads((prev) => [thread, ...prev]);
      return thread.id;
    } catch {
      return null;
    }
  }

  async function deleteThread(id: string) {
    try { await fetch(`${API}/chat/threads/${id}`, { method: "DELETE", headers: await authHeaders() }); } catch {}
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) newChat();
  }

  async function commitRename(id: string) {
    const title = renameText.trim().slice(0, 200) || "New chat";
    setRenamingId(null);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    try {
      await fetch(`${API}/chat/threads/${id}`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ title }),
      });
    } catch {}
  }

  // ── Attachments: one paperclip → Photo / PDF (paid uploads) / Attach from app (free) ──
  function requirePaid(): boolean {
    if (isPaid) return true;
    setUpgradeFeature("attachments");
    setUpgradeVisible(true);
    return false;
  }

  /** Presign + PUT a local file to R2, then stage it as an `upload` attachment. */
  async function uploadToR2(uri: string, mime: string, name: string) {
    setUploading(true);
    try {
      const presign = await fetch(`${API}/upload/presign`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ type: "chat", contentType: mime, filename: name }),
      });
      if (!presign.ok) throw new Error("presign failed");
      const { uploadUrl, publicUrl } = await presign.json();
      const blob = await (await fetch(uri)).blob();
      const put = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": mime } });
      if (!put.ok) throw new Error("upload failed");
      setPendingUploads((prev) => [...prev, { kind: "upload", url: publicUrl, mime, name }]);
    } catch {}
    finally { setUploading(false); }
  }

  async function pickImage() {
    setAttachMenuOpen(false);
    if (!requirePaid()) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await uploadToR2(asset.uri, asset.mimeType ?? "image/jpeg", asset.fileName ?? `photo-${Date.now()}.jpg`);
  }

  async function pickPdf() {
    setAttachMenuOpen(false);
    if (!requirePaid()) return;
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await uploadToR2(asset.uri, asset.mimeType ?? "application/pdf", asset.name ?? `document-${Date.now()}.pdf`);
  }

  function removeUpload(idx: number) {
    setPendingUploads((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── In-app attachments (free for everyone) ────────────────────────────────
  function openInAppPicker() {
    setAttachMenuOpen(false);
    setInAppOpen(true);
    loadInApp(inAppTab);
  }

  async function loadInApp(tab: InAppTab) {
    setInAppTab(tab);
    setInAppLoading(true);
    setAllInAppItems([]);
    setInAppSearch("");
    setInAppDisplayCount(20);
    try {
      const src = IN_APP_SOURCES[tab];
      const res = await fetch(`${API}${src.endpoint}`, { headers: await authHeaders() });
      const data = await res.json();
      const rows: RawRow[] = data?.[src.key] ?? [];
      setAllInAppItems(rows.filter(src.filter ?? (() => true)).map(src.map).filter((i) => i.id));
    } catch {
      setAllInAppItems([]);
    } finally {
      setInAppLoading(false);
    }
  }

  // Derived search + pagination (computed inline at render time)
  const filteredInAppItems = (() => {
    const q = inAppSearch.trim().toLowerCase();
    if (!q) return allInAppItems;
    return allInAppItems.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.sub?.toLowerCase().includes(q) ?? false),
    );
  })();
  const visibleInAppItems = filteredInAppItems.slice(0, inAppDisplayCount);
  const inAppHasMore = inAppDisplayCount < filteredInAppItems.length;

  function addInApp(item: InAppItem) {
    setPendingUploads((prev) => [...prev, { kind: inAppTab, refId: item.id, name: item.label }]);
    setInAppOpen(false);
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSendError(null);

    const threadId = await ensureThread();
    if (!threadId) {
      setSendError("Couldn't create a conversation. Please try again.");
      return;
    }

    const attachments = [...pendingUploads];
    setInput("");
    setPendingUploads([]);
    setSending(true);

    const userMsg: Message = { id: `tmp-u-${Date.now()}`, role: "user", content: text, attachments };
    const asstMsg: Message = { id: `tmp-a-${Date.now()}`, role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, asstMsg]);

    try {
      const res = await fetch(`${API}/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ text, attachments: attachments.length ? attachments : undefined }),
      });

      if (res.status === 402) {
        const err = await res.json().catch(() => ({}));
        if (err.feature === "attachments") {
          setUpgradeFeature("attachments");
          setUpgradeVisible(true);
          setMessages((prev) => prev.filter((m) => m.id !== asstMsg.id && m.id !== userMsg.id));
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsg.id
                ? { ...m, pending: false, content: "⚡ You're out of AI messages for this month. Upgrade your plan for more — your free allowance resets at the start of next month." }
                : m,
            ),
          );
        }
        setSending(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error("send failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            let payload: Record<string, unknown> = {};
            try { payload = JSON.parse(line.slice(6)); } catch {}

            if (currentEvent === "chunk") {
              const delta = String(payload.delta ?? "");
              setMessages((prev) =>
                prev.map((m) => (m.id === asstMsg.id ? { ...m, content: m.content + delta } : m)),
              );
            } else if (currentEvent === "usage" || currentEvent === "done") {
              if (payload.remaining !== null && payload.remaining !== undefined) {
                setRemaining(Number(payload.remaining));
              }
              if (currentEvent === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === asstMsg.id ? { ...m, pending: false, id: String(payload.message_id ?? m.id) } : m,
                  ),
                );
                if (payload.title && typeof payload.title === "string") {
                  const aiTitle = payload.title as string;
                  setThreads((prev) =>
                    prev.map((t) => (t.id === threadId ? { ...t, title: aiTitle } : t)),
                  );
                }
              }
            } else if (currentEvent === "error") {
              setMessages((prev) => prev.filter((m) => m.id !== asstMsg.id && m.id !== userMsg.id));
              setSendError(String(payload.message ?? "Something went wrong. Please try again."));
            }
          }
        }
      }
      loadThreads();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== asstMsg.id && m.id !== userMsg.id));
      setSendError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }, [input, sending, pendingUploads, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Markdown → <Text> (mirrors projects.tsx renderContent) ────────────────
  function renderContent(content: string) {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <Text key={i} style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 6, marginBottom: 3 }}>{line.slice(2)}</Text>;
      if (line.startsWith("## ")) return <Text key={i} style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 3 }}>{line.slice(3)}</Text>;
      if (line.startsWith("### ")) return <Text key={i} style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 8, marginBottom: 2 }}>{line.slice(4)}</Text>;
      if (line.startsWith("- ") || line.startsWith("* ")) return <Text key={i} style={{ fontSize: 14, color: colors.text, marginLeft: 10, marginBottom: 3, lineHeight: 21 }}>{"• "}{line.slice(2)}</Text>;
      if (line.trim() === "") return <View key={i} style={{ height: 6 }} />;
      const bold = line.replace(/\*\*([^*]+)\*\*/g, "«$1»");
      return (
        <Text key={i} style={{ fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 2 }}>
          {bold.split("«").map((part, j) => {
            if (j === 0) return part;
            const [b, rest] = part.split("»");
            return [<Text key={`b${j}`} style={{ fontWeight: "700" }}>{b}</Text>, rest];
          })}
        </Text>
      );
    });
  }

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === "user";
    return (
      <MotiView
        from={{ opacity: 0, translateY: 6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 200 }}
        style={{ flexDirection: "row", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}
      >
        <View
          style={{
            maxWidth: "86%",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: isUser ? colors.brand : colors.card,
            borderWidth: isUser ? 0 : 1,
            borderColor: colors.borderSubtle,
          }}
        >
          {item.attachments && item.attachments.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {item.attachments.map((a, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isUser ? "rgba(255,255,255,0.2)" : colors.cardSubtle, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Paperclip size={12} color={isUser ? "#FFFFFF" : colors.brand} />
                  <Text style={{ fontSize: 11, color: isUser ? "#FFFFFF" : colors.textSecondary, maxWidth: 120 }} numberOfLines={1}>{a.name ?? a.kind}</Text>
                </View>
              ))}
            </View>
          )}
          {isUser ? (
            <Text style={{ fontSize: 14, color: "#FFFFFF", lineHeight: 21 }}>{item.content}</Text>
          ) : item.content ? (
            <View>{renderContent(item.content)}</View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={{ fontSize: 13, color: colors.textTertiary }}>Thinking…</Text>
            </View>
          )}
        </View>
      </MotiView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardSubtle }} edges={["top", "bottom"]}>
      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} feature={upgradeFeature} plan={plan} />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
        {/* Back to home */}
        <Pressable
          onPress={() => router.push("/(drawer)/(tabs)/home")}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 6, borderRadius: 10 }}
          hitSlop={8}
        >
          <ArrowLeft size={18} color={colors.textTertiary} />
          <House size={18} color={colors.textTertiary} />
        </Pressable>
        {/* Conversations toggle */}
        <Pressable
          onPress={() => setThreadsOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.cardSubtle }}
        >
          <ChatCircleDots size={17} color={colors.text} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>Pass AI</Text>
        </Pressable>
        {/* New chat */}
        <Pressable onPress={newChat} style={{ padding: 6, borderRadius: 10 }} hitSlop={8}>
          <Plus size={22} color={colors.brand} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={{ flex: 1 }}
      >
        {messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <RNImage
              source={require("../../../assets/images/icon.png")}
              style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 14 }}
              resizeMode="cover"
            />
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 4 }}>Ask Pass anything</Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, textAlign: "center", lineHeight: 19 }}>
              Get a direct answer with full working — for any ZIMSEC subject.{isPaid ? " Attach a photo of a question." : ""}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Composer */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.card, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 }}>
          {pendingUploads.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {pendingUploads.map((a, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardSubtle, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
                  <Paperclip size={12} color={colors.brand} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, maxWidth: 120 }} numberOfLines={1}>{a.name}</Text>
                  <Pressable onPress={() => removeUpload(i)} hitSlop={6}>
                    <X size={12} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <Pressable onPress={() => setAttachMenuOpen(true)} disabled={uploading || sending} style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardSubtle }}>
              {uploading ? <ActivityIndicator size="small" color={colors.brand} /> : <Paperclip size={20} color={colors.textTertiary} />}
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask a study question…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              editable={!sending}
              style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, backgroundColor: colors.cardSubtle, opacity: sending ? 0.6 : 1 }}
            />
            <Pressable
              onPress={send}
              disabled={!input.trim() || sending}
              style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: input.trim() && !sending ? colors.brand : `${colors.brand}55` }}
            >
              {sending
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <PaperPlaneRight size={18} color="#FFFFFF" weight="fill" />}
            </Pressable>
          </View>
          {sendError ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5" }}>
              <Text style={{ flex: 1, fontSize: 12, color: "#DC2626" }}>{sendError}</Text>
              <Pressable onPress={() => setSendError(null)} hitSlop={8}>
                <X size={14} color="#DC2626" />
              </Pressable>
            </View>
          ) : null}
          <Text style={{ fontSize: 10, color: colors.textTertiary, textAlign: "center", marginTop: 6 }}>
            {remaining !== null && Number.isFinite(remaining)
              ? `${remaining} message${remaining === 1 ? "" : "s"} left this month`
              : "Pass can make mistakes — double-check important answers."}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Threads drawer */}
      <Modal visible={threadsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setThreadsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Your chats</Text>
            <Pressable onPress={() => setThreadsOpen(false)} style={{ padding: 6 }}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
          <Pressable onPress={newChat} style={{ flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 12, justifyContent: "center" }}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>New chat</Text>
          </Pressable>
          <FlatList
            data={threads}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={<Text style={{ textAlign: "center", color: colors.textTertiary, fontSize: 13, marginTop: 32 }}>No conversations yet.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => renamingId !== item.id && selectThread(item.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: activeId === item.id ? colors.indigoBg : "transparent" }}
              >
                <ChatCircleDots size={18} color={activeId === item.id ? colors.brand : colors.textTertiary} />
                {renamingId === item.id ? (
                  <TextInput
                    autoFocus
                    value={renameText}
                    onChangeText={setRenameText}
                    onBlur={() => commitRename(item.id)}
                    onSubmitEditing={() => commitRename(item.id)}
                    style={{ flex: 1, fontSize: 14, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.brand, paddingVertical: 0 }}
                  />
                ) : (
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text }} numberOfLines={1}>{item.title}</Text>
                )}
                <Pressable onPress={() => { setRenamingId(item.id); setRenameText(item.title); }} hitSlop={8} style={{ marginRight: 4 }}>
                  <PencilSimple size={15} color={colors.textTertiary} />
                </Pressable>
                <Pressable onPress={() => deleteThread(item.id)} hitSlop={8}>
                  <Trash size={16} color={colors.textTertiary} />
                </Pressable>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Attachment menu — Photo / PDF (paid uploads) + Attach from app (free) */}
      <Modal visible={attachMenuOpen} transparent animationType="fade" onRequestClose={() => setAttachMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }} onPress={() => setAttachMenuOpen(false)}>
          <Pressable style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: 28, paddingHorizontal: 12 }}>
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 }} />
            {[
              { icon: ImageIcon, label: "Photo", hint: isPaid ? "Upload an image of a question" : "Paid plans", onPress: pickImage },
              { icon: FilePdf, label: "PDF", hint: isPaid ? "Upload a PDF document" : "Paid plans", onPress: pickPdf },
              { icon: Folder, label: "Attach from app", hint: "Papers, sessions, resources, projects", onPress: openInAppPicker },
            ].map((row) => (
              <Pressable
                key={row.label}
                onPress={row.onPress}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.indigoBg }}>
                  <row.icon size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{row.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }}>{row.hint}</Text>
                </View>
                <CaretRight size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* In-app picker — bottom sheet with 2-col grid, search, pagination */}
      <Modal visible={inAppOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInAppOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.card }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>Attach from app</Text>
            <Pressable onPress={() => setInAppOpen(false)} style={{ padding: 6 }}>
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          </View>
          {/* Tabs */}
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
            {(Object.keys(IN_APP_SOURCES) as InAppTab[]).map((tab) => {
              const active = inAppTab === tab;
              const Icon = TAB_ICONS[tab];
              return (
                <Pressable
                  key={tab}
                  onPress={() => loadInApp(tab)}
                  style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: active ? colors.indigoBg : colors.cardSubtle }}
                >
                  <Icon size={18} color={active ? colors.brand : colors.textTertiary} />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: active ? colors.brand : colors.textTertiary }}>{IN_APP_SOURCES[tab].title}</Text>
                </Pressable>
              );
            })}
          </View>
          {/* Search */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.cardSubtle, borderWidth: 1, borderColor: colors.border }}>
            <FileText size={16} color={colors.textTertiary} />
            <TextInput
              value={inAppSearch}
              onChangeText={(t) => { setInAppSearch(t); setInAppDisplayCount(20); }}
              placeholder={`Search ${IN_APP_SOURCES[inAppTab].title.toLowerCase()}…`}
              placeholderTextColor={colors.textPlaceholder}
              style={{ flex: 1, fontSize: 14, color: colors.text }}
            />
            {inAppSearch ? (
              <Pressable onPress={() => setInAppSearch("")} hitSlop={8}>
                <X size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
          {/* 2-col grid */}
          {inAppLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (
            <FlatList
              data={visibleInAppItems}
              keyExtractor={(i) => i.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: colors.textTertiary, fontSize: 13, marginTop: 40 }}>
                  {inAppSearch ? "No results found." : "Nothing here yet."}
                </Text>
              }
              onEndReached={() => { if (inAppHasMore) setInAppDisplayCount((c) => c + 20); }}
              onEndReachedThreshold={0.3}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => addInApp(item)}
                  style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: colors.cardSubtle, borderWidth: 1, borderColor: colors.border }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Folder size={18} color={colors.brand} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 18 }} numberOfLines={2}>{item.label}</Text>
                  {item.sub ? <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }} numberOfLines={1}>{item.sub}</Text> : null}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
