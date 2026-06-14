import {
  ChatCircleDots,
  Lightning,
  Paperclip,
  PaperPlaneRight,
  Plus,
  Sparkle,
  Trash,
  X,
} from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { MotiView } from "moti";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  const [plan, setPlan] = useState("FREE");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);

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

  // ── Image upload (paid feature) ───────────────────────────────────────────
  async function onAttachPress() {
    if (!isPaid) {
      setUpgradeFeature("attachments");
      setUpgradeVisible(true);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    setUploading(true);
    try {
      const presign = await fetch(`${API}/upload/presign`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ type: "chat", contentType: mime, filename: name }),
      });
      if (!presign.ok) throw new Error("presign failed");
      const { uploadUrl, publicUrl } = await presign.json();
      const blob = await (await fetch(asset.uri)).blob();
      const put = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": mime } });
      if (!put.ok) throw new Error("upload failed");
      setPendingUploads((prev) => [...prev, { kind: "upload", url: publicUrl, mime, name }]);
    } catch {}
    finally { setUploading(false); }
  }

  function removeUpload(idx: number) {
    setPendingUploads((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const threadId = await ensureThread();
    if (!threadId) return;

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
              }
            } else if (currentEvent === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === asstMsg.id ? { ...m, pending: false, content: String(payload.message ?? "Something went wrong.") } : m,
                ),
              );
            }
          }
        }
      }
      loadThreads();
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsg.id ? { ...m, pending: false, content: "Something went wrong. Please try again." } : m,
        ),
      );
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardSubtle }} edges={["top"]}>
      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} feature={upgradeFeature} plan={plan} />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
        <Pressable onPress={() => setThreadsOpen(true)} style={{ padding: 6 }}>
          <ChatCircleDots size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Pass AI</Text>
        <Pressable onPress={newChat} style={{ padding: 6 }}>
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
            <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: colors.indigoBg, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Sparkle size={28} color={colors.brand} />
            </View>
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
            <Pressable onPress={onAttachPress} disabled={uploading || sending} style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardSubtle }}>
              {uploading ? <ActivityIndicator size="small" color={colors.brand} /> : <Paperclip size={20} color={colors.textTertiary} />}
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask a study question…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              style={{ flex: 1, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, backgroundColor: colors.cardSubtle }}
            />
            <Pressable
              onPress={send}
              disabled={!input.trim() || sending}
              style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: input.trim() && !sending ? colors.brand : `${colors.brand}55` }}
            >
              <PaperPlaneRight size={18} color="#FFFFFF" weight="fill" />
            </Pressable>
          </View>
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
                onPress={() => selectThread(item.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: activeId === item.id ? colors.indigoBg : "transparent" }}
              >
                <ChatCircleDots size={18} color={activeId === item.id ? colors.brand : colors.textTertiary} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }} numberOfLines={1}>{item.title}</Text>
                <Pressable onPress={() => deleteThread(item.id)} hitSlop={8}>
                  <Trash size={16} color={colors.textTertiary} />
                </Pressable>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
