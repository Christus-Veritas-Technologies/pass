"use client";

import {
  AiChat01Icon,
  Add01Icon,
  Attachment01Icon,
  Cancel01Icon,
  Delete02Icon,
  Folder01Icon,
  SentIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownContent } from "@/lib/render-markdown";
import { getAccessToken } from "@/lib/auth";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

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

const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

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
const IN_APP_TABS = Object.keys(IN_APP_SOURCES) as InAppTab[];

// ─── API helpers ─────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pendingUploads, setPendingUploads] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // In-app attachment picker (papers / sessions / resources / projects)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<InAppTab>("paper");
  const [pickerItems, setPickerItems] = useState<InAppItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Upgrade dialog
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"aiMessages" | "attachments">("attachments");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPaid = plan !== "FREE";

  // ── Initial load: plan + threads ──────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.user?.plan) setPlan(d.user.plan); })
      .catch(() => {});
    loadThreads();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll on new content ────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadThreads() {
    try {
      const res = await fetch(`${API}/chat/threads`, { headers: authHeaders() });
      const data = await res.json();
      setThreads(data.threads ?? []);
      if (!activeId && data.threads?.length) selectThread(data.threads[0].id);
    } catch { /* ignore */ }
  }

  async function selectThread(id: string) {
    setActiveId(id);
    setMessages([]);
    try {
      const res = await fetch(`${API}/chat/threads/${id}/messages`, { headers: authHeaders() });
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* ignore */ }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setPendingUploads([]);
    setInput("");
  }

  async function ensureThread(): Promise<string | null> {
    if (activeId) return activeId;
    try {
      const res = await fetch(`${API}/chat/threads`, { method: "POST", headers: authHeaders(), body: "{}" });
      const thread = await res.json();
      setActiveId(thread.id);
      setThreads((prev) => [thread, ...prev]);
      return thread.id;
    } catch {
      return null;
    }
  }

  async function deleteThread(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`${API}/chat/threads/${id}`, { method: "DELETE", headers: authHeaders() });
    } catch { /* ignore */ }
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) newChat();
  }

  // ── File upload (paid feature) ────────────────────────────────────────────
  function onAttachClick() {
    if (!isPaid) {
      setUpgradeFeature("attachments");
      setUpgradeOpen(true);
      return;
    }
    fileRef.current?.click();
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const presign = await fetch(`${API}/upload/presign`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type: "chat", contentType: file.type, filename: file.name }),
      });
      if (!presign.ok) throw new Error("presign failed");
      const { uploadUrl, publicUrl } = await presign.json();
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("upload failed");
      setPendingUploads((prev) => [...prev, { kind: "upload", url: publicUrl, mime: file.type, name: file.name }]);
    } catch { /* non-fatal */ }
    finally { setUploading(false); }
  }

  function removeUpload(idx: number) {
    setPendingUploads((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── In-app attachments (free for everyone) ────────────────────────────────
  function togglePicker() {
    const next = !pickerOpen;
    setPickerOpen(next);
    if (next) loadPicker(pickerTab);
  }

  async function loadPicker(tab: InAppTab) {
    setPickerTab(tab);
    setPickerLoading(true);
    setPickerItems([]);
    try {
      const src = IN_APP_SOURCES[tab];
      const res = await fetch(`${API}${src.endpoint}`, { headers: authHeaders() });
      const data = await res.json();
      const rows: RawRow[] = data?.[src.key] ?? [];
      setPickerItems(rows.filter(src.filter ?? (() => true)).map(src.map).filter((i) => i.id));
    } catch {
      setPickerItems([]);
    } finally {
      setPickerLoading(false);
    }
  }

  function addInApp(item: InAppItem) {
    setPendingUploads((prev) => [...prev, { kind: pickerTab, refId: item.id, name: item.label }]);
    setPickerOpen(false);
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

    // Optimistic user bubble + an empty assistant bubble we stream into.
    const userMsg: Message = { id: `tmp-u-${Date.now()}`, role: "user", content: text, attachments };
    const asstMsg: Message = { id: `tmp-a-${Date.now()}`, role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, asstMsg]);

    try {
      const res = await fetch(`${API}/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text, attachments: attachments.length ? attachments : undefined }),
      });

      if (res.status === 402) {
        const err = await res.json().catch(() => ({}));
        // Out of messages → inline note. Attachment gate → upgrade dialog.
        if (err.feature === "attachments") {
          setUpgradeFeature("attachments");
          setUpgradeOpen(true);
          setMessages((prev) => prev.filter((m) => m.id !== asstMsg.id && m.id !== userMsg.id));
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsg.id
                ? { ...m, pending: false, content: "⚡ **You're out of AI messages for this month.** Upgrade your plan for more — your free allowance resets at the start of next month." }
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
            const raw = line.slice(6);
            let payload: Record<string, unknown> = {};
            try { payload = JSON.parse(raw); } catch { /* ignore */ }

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
                  m.id === asstMsg.id
                    ? { ...m, pending: false, content: String(payload.message ?? "Something went wrong.") }
                    : m,
                ),
              );
            }
          }
        }
      }

      // Refresh the sidebar so a newly auto-titled thread shows its title.
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 -m-6 p-6">
      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature={upgradeFeature} plan={plan} />

      {/* Thread list */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col rounded-2xl border border-border bg-card/40">
        <button
          onClick={newChat}
          className="m-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" /> New chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {threads.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No conversations yet.</p>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => selectThread(t.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                activeId === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={AiChat01Icon} className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 truncate">{t.title}</span>
              <span
                onClick={(e) => deleteThread(t.id, e)}
                className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                role="button"
                aria-label="Delete chat"
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex flex-1 flex-col rounded-2xl border border-border bg-card/40 overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center animate-fade-up">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <HugeiconsIcon icon={AiChat01Icon} className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Ask Pass anything</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Get a direct answer with full working — for any ZIMSEC subject. Attach a photo or PDF of a question{isPaid ? "" : " (paid plans)"}.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background",
                    )}
                  >
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {m.attachments.map((a, i) => (
                          <span key={i} className="flex items-center gap-1 rounded-md bg-black/10 px-2 py-1 text-xs dark:bg-white/10">
                            <HugeiconsIcon icon={a.kind === "project" ? Folder01Icon : Attachment01Icon} className="h-3 w-3" />
                            {a.name ?? a.kind}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" ? (
                      m.content ? (
                        <MarkdownContent text={m.content} />
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <HugeiconsIcon icon={SparklesIcon} className="h-4 w-4 animate-pulse" /> Thinking…
                        </span>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/60 p-3 md:px-8 md:py-4">
          <div className="relative mx-auto max-w-3xl">
            {/* In-app attachment picker */}
            {pickerOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                <div className="flex items-center gap-1 border-b border-border p-1.5">
                  {IN_APP_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => loadPicker(tab)}
                      className={cn(
                        "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                        pickerTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {IN_APP_SOURCES[tab].title}
                    </button>
                  ))}
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5">
                  {pickerLoading ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
                  ) : pickerItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Nothing here yet.</p>
                  ) : (
                    pickerItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addInApp(item)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{item.label}</p>
                          {item.sub && <p className="truncate text-xs text-muted-foreground">{item.sub}</p>}
                        </div>
                        <HugeiconsIcon icon={Add01Icon} className="h-3.5 w-3.5 shrink-0 text-primary" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {pendingUploads.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingUploads.map((a, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs">
                    <HugeiconsIcon icon={Attachment01Icon} className="h-3.5 w-3.5 text-primary" />
                    <span className="max-w-[140px] truncate">{a.name}</span>
                    <button onClick={() => removeUpload(i)} aria-label="Remove">
                      <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-primary">
              <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={onFilePicked} />
              <button
                onClick={onAttachClick}
                disabled={uploading || sending}
                aria-label="Upload photo or PDF"
                title="Upload a photo or PDF"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <HugeiconsIcon icon={uploading ? SparklesIcon : Attachment01Icon} className={cn("h-5 w-5", uploading && "animate-pulse")} />
              </button>
              <button
                onClick={togglePicker}
                disabled={sending}
                aria-label="Attach from app"
                title="Attach a paper, session, resource or project"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
                  pickerOpen ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
              >
                <HugeiconsIcon icon={Folder01Icon} className="h-5 w-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder="Ask a study question…"
                className="flex-1 resize-none bg-transparent px-1 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-40"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <HugeiconsIcon icon={SentIcon} className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-center text-[11px] text-muted-foreground">
              {remaining !== null && Number.isFinite(remaining)
                ? `${remaining} message${remaining === 1 ? "" : "s"} left this month`
                : "Pass can make mistakes — double-check important answers."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
