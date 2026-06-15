"use client";

import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Folder01Icon,
  SparklesIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { getAccessToken } from "@/lib/auth";
import { UpgradeDialog } from "@/components/upgrade-dialog";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

const GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

// Normalise a subject string to a lookup key (mirrors server lib/subjects.ts)
function toSubjectKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().replace(/ /g, "-");
}

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

function isValidSubject(subject: string): boolean {
  const key = toSubjectKey(subject.trim());
  return SUBJECT_KEYS.has(key) || SUBJECT_KEYS.has(SUBJECT_ALIASES[key] ?? "");
}

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

const TEXT_MIME = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5 text-foreground">{line.slice(4)}</h3>;
    if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mt-2 mb-3 text-foreground">{line.slice(2)}</h1>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="text-sm text-foreground ml-4 list-disc">{line.slice(2)}</li>;
    if (line.match(/^\d+\.\s/)) return <li key={i} className="text-sm text-foreground ml-4 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
    if (line.trim() === "") return <br key={i} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm text-foreground leading-relaxed mb-1">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

interface FormErrors {
  centreNumber?: string;
  candidateNumber?: string;
  subject?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 form state — pre-filled from session on mount
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [centreNumber, setCentreNumber] = useState("");
  const [candidateNumber, setCandidateNumber] = useState("");
  const [grade, setGrade] = useState<string>(GRADES[1]);
  const [subject, setSubject] = useState("");
  const [outline, setOutline] = useState("");
  const [outlineFileName, setOutlineFileName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // Step 2 generation state
  const [projectId, setProjectId] = useState("");
  const [streamedContent, setStreamedContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [genError, setGenError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Upgrade dialog
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState("FREE");

  // Pre-fill name / school / grade from the authenticated session on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (!u) return;
        if (u.name) setStudentName(u.name);
        if (u.school) setSchoolName(u.school);
        if (u.grade && (["Grade 7", "Form 4", "Form 6"] as string[]).includes(u.grade)) setGrade(u.grade);
      })
      .catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (centreNumber.trim() && !isNumeric(centreNumber)) {
      errs.centreNumber = "Must be digits only (e.g. 1234).";
    }
    if (candidateNumber.trim() && !isNumeric(candidateNumber)) {
      errs.candidateNumber = "Must be digits only (e.g. 5678).";
    }
    if (!subject.trim()) {
      errs.subject = "Subject is required.";
    } else if (!isValidSubject(subject)) {
      errs.subject = "Subject not recognised or not supported. Check spelling and try again.";
    }
    return errs;
  }

  function handleContinue() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  }

  const canContinue = subject.trim();

  async function startGeneration() {
    setGenerating(true);
    setStreamedContent("");
    setGenError("");
    setDone(false);
    setProjectId("");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/projects/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ studentName, schoolName, district, province, centreNumber, candidateNumber, grade, subject, outline: outline.trim() || undefined }),
        signal: abort.signal,
      });

      if (res.status === 401) {
        router.push("/login?redirect=/projects/new");
        return;
      }
      if (res.status === 402) {
        const err = await res.json().catch(() => ({}));
        setUpgradePlan((err as { plan?: string }).plan ?? "FREE");
        setUpgradeOpen(true);
        setGenerating(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let dataLines: string[] = [];

      // SSE dispatch: a blank line terminates an event. Multi-line `data:`
      // fields are rejoined with "\n" (markdown sections carry real newlines).
      const flush = () => {
        if (!eventType && dataLines.length === 0) return;
        const data = dataLines.join("\n");
        if (eventType === "project_id") {
          setProjectId(data);
        } else if (eventType === "chunk") {
          setStreamedContent((prev) => prev + data);
        } else if (eventType === "done") {
          setDone(true);
        } else if (eventType === "error") {
          setGenError("AI generation failed. Please try again.");
        }
        eventType = "";
        dataLines = [];
      };

      while (reader) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
          if (line === "") {
            flush();
          } else if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
          }
        }
      }
      flush();
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setGenError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  // Auto-start generation when entering step 2
  useEffect(() => {
    if (step === 2) {
      startGeneration();
    }
    return () => abortRef.current?.abort();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract project title from streamed content
  const titleMatch = streamedContent.match(/^#\s+(.+)$/m);
  const projectTitle = titleMatch ? titleMatch[1].trim() : "";

  // Progress is derived from the stream: the server emits the 6 HBC stages
  // (## headings) in order, so we can show which one is being written.
  const TOTAL_SECTIONS = 6;
  const sectionsWritten = (streamedContent.match(/^##\s+/gm) ?? []).length;
  const progressPct = Math.min(100, Math.round((sectionsWritten / TOTAL_SECTIONS) * 100));
  const progressLabel = sectionsWritten === 0
    ? "Planning your project…"
    : `Writing section ${Math.min(sectionsWritten, TOTAL_SECTIONS)} of ${TOTAL_SECTIONS}…`;

  function cancelGeneration() {
    abortRef.current?.abort();
    setGenerating(false);
    setStep(1);
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="projects"
        plan={upgradePlan}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-border hover:bg-muted transition-colors"
          disabled={step === 2 && generating}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Project</h1>
          <p className="text-xs text-muted-foreground">ZIMSEC Heritage-Based Curriculum</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Step {step} of 2</span>
          <span className="text-xs text-muted-foreground">
            {step === 1 ? "Candidate Information" : "Generating Project"}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {/* ── Step 1: Candidate Information ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground/90">Full Name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Tendai Moyo"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
            />
          </div>

          {/* School Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground/90">School Name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Harare High School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
            />
          </div>

          {/* District + Province */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground/90">District <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Mutare"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground/90">Province <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Manicaland"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
              />
            </div>
          </div>

          {/* Centre + Candidate numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground/90">Centre Number <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1234"
                value={centreNumber}
                onChange={(e) => { setCentreNumber(e.target.value); setErrors((p) => ({ ...p, centreNumber: undefined })); }}
                className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent ${errors.centreNumber ? "border-destructive" : "border-border"}`}
              />
              {errors.centreNumber && <p className="text-xs text-destructive mt-0.5">{errors.centreNumber}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground/90">Candidate Number <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5678"
                value={candidateNumber}
                onChange={(e) => { setCandidateNumber(e.target.value); setErrors((p) => ({ ...p, candidateNumber: undefined })); }}
                className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent ${errors.candidateNumber ? "border-destructive" : "border-border"}`}
              />
              {errors.candidateNumber && <p className="text-xs text-destructive mt-0.5">{errors.candidateNumber}</p>}
            </div>
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">Grade</label>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    grade === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Subject — free text */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground/90">Subject</label>
            <input
              type="text"
              placeholder="e.g. Biology, History, Shona…"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: undefined })); }}
              className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent ${errors.subject ? "border-destructive" : "border-border"}`}
            />
            {errors.subject ? (
              <p className="text-xs text-destructive mt-0.5">{errors.subject}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Supported: Mathematics, Physics, Chemistry, Biology, History, Geography, Agriculture, Commerce, Accounting, Computer Science, Shona, Ndebele, and more.
              </p>
            )}
          </div>

          {/* Outline — optional */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground/90">
                Project Outline <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <label
                htmlFor="outline-file"
                className="flex items-center gap-1.5 cursor-pointer text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <HugeiconsIcon icon={Upload01Icon} className="h-3.5 w-3.5" />
                {outlineFileName || "Upload .txt or .md file"}
                <input
                  id="outline-file"
                  type="file"
                  accept=".txt,.md,.markdown,text/plain,text/markdown"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!TEXT_MIME.has(file.type) && !file.name.match(/\.(txt|md|markdown)$/i)) {
                      setErrors((p) => ({ ...p }));
                      alert("For PDF or Word documents, please copy and paste the content into the text area below.");
                      return;
                    }
                    const text = await readFileAsText(file).catch(() => "");
                    if (text) { setOutline(text); setOutlineFileName(file.name); }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <textarea
              placeholder="Paste or type your project outline, teacher guide, or any specific requirements here…"
              value={outline}
              onChange={(e) => { setOutline(e.target.value); if (e.target.value === "") setOutlineFileName(""); }}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground">
              When provided, the AI will generate the project strictly according to your outline. Leave blank for a fully AI-structured project.
            </p>
          </div>

          <Button
            className="w-full mt-2"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      )}

      {/* ── Step 2: Generating ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          {genError ? (
            <Card className="rounded-xl">
              <CardContent className="py-8 flex flex-col items-center text-center gap-4">
                <p className="text-sm text-destructive">{genError}</p>
                <Button variant="outline" onClick={() => setStep(1)}>Try Again</Button>
              </CardContent>
            </Card>
          ) : done ? (
            <Card className="rounded-xl border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardContent className="py-6 flex flex-col items-center text-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Project Generated!</p>
                  {projectTitle && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 italic">"{projectTitle}"</p>
                  )}
                </div>
                <Button className="w-full" onClick={() => router.push(`/projects/${projectId}`)}>
                  <HugeiconsIcon icon={Folder01Icon} className="mr-2 h-4 w-4" />
                  Open Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl">
              <CardContent className="py-6 flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                  <HugeiconsIcon icon={SparklesIcon} className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{progressLabel}</p>
                <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(8, progressPct)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">This usually takes under a minute. You can navigate away — we'll notify you when it's ready.</p>
                <Button variant="outline" className="mt-1" onClick={cancelGeneration}>
                  Cancel generation
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Live preview of streamed content */}
          {streamedContent && (
            <Card className="rounded-xl mt-4">
              <CardContent className="py-5 px-5">
                {generating && (
                  <div className="flex items-center gap-2 mb-4 text-xs text-primary">
                    <HugeiconsIcon icon={SparklesIcon} className="h-3.5 w-3.5 animate-pulse" />
                    Writing…
                  </div>
                )}
                <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                  {renderMarkdown(streamedContent)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
