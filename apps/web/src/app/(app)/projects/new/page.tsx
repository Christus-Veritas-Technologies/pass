"use client";

import {
  ArrowLeft01Icon,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  FlowerIcon,
  Mortarboard01Icon,
  MusicNote01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@pass/ui/components/button";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

// ─── Data ────────────────────────────────────────────────────────────────────

const GRADES = ["Grade 7", "Form 4", "Form 6"] as const;
type Grade = typeof GRADES[number];

const SUBJECTS_BY_GRADE: Record<Grade, string[]> = {
  "Grade 7":  ["Heritage Studies", "Mathematics", "English", "Science", "Shona", "Ndebele"],
  "Form 4":   ["History", "Combined Science", "Agriculture", "Biology", "Chemistry", "Geography", "Shona", "English Literature", "Physics"],
  "Form 6":   ["History", "Geography", "Sociology", "Agriculture", "Biology", "Chemistry", "Physics", "Shona"],
};

const CATEGORIES = [
  {
    id: "Culture & History",
    icon: BookOpen01Icon,
    title: "Culture & History",
    desc: "Totems, clan systems, liberation struggle, folktales, marriage customs",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    activeBorder: "border-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  {
    id: "Indigenous Sciences",
    icon: FlowerIcon,
    title: "Indigenous Sciences",
    desc: "Traditional medicine, organic farming, biogas, solar energy systems",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    activeBorder: "border-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  {
    id: "Arts & Lifestyle",
    icon: MusicNote01Icon,
    title: "Arts & Lifestyle",
    desc: "Traditional architecture, food preparation, music, traditional games",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    activeBorder: "border-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
  },
] as const;

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
              step >= n
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step > n ? <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-4 w-4" /> : n}
          </div>
          <span className={`text-sm font-medium ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>
            {n === 1 ? "Candidate Info" : "Generate Project"}
          </span>
          {n < 2 && (
            <div className={`h-px w-8 transition-colors duration-200 ${step > n ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <span className="ml-1.5 text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const INPUT_CLS = "block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 transition-shadow duration-150";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [studentName, setStudentName]         = useState("");
  const [centreNumber, setCentreNumber]       = useState("");
  const [candidateNumber, setCandidateNumber] = useState("");
  const [grade, setGrade]                     = useState<Grade>("Form 4");
  const [subject, setSubject]                 = useState(SUBJECTS_BY_GRADE["Form 4"][0]!);
  const [category, setCategory]               = useState<string>("");

  // Step 2 state
  const [projectId, setProjectId]             = useState<string>("");
  const [streamedContent, setStreamedContent] = useState("");
  const [projectTitle, setProjectTitle]       = useState("");
  const [generating, setGenerating]           = useState(false);
  const [done, setDone]                       = useState(false);
  const [error, setError]                     = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Reset subject when grade changes
  useEffect(() => {
    setSubject(SUBJECTS_BY_GRADE[grade][0]!);
  }, [grade]);

  const step1Valid = studentName.trim() && centreNumber.trim() && candidateNumber.trim() && category;

  async function startGeneration() {
    setGenerating(true);
    setStreamedContent("");
    setProjectTitle("");
    setError("");
    setDone(false);

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
        body: JSON.stringify({ studentName: studentName.trim(), centreNumber: centreNumber.trim(), candidateNumber: candidateNumber.trim(), grade, subject, category }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (reader) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: project_id")) continue;
          if (line.startsWith("event: done")) {
            setDone(true);
          }
          if (line.startsWith("event: error")) {
            setError("AI generation failed. Please try again.");
          }
          if (line.startsWith("data: ")) {
            const chunk = line.slice(6);
            if (chunk.startsWith("proj_") && !projectId) {
              setProjectId(chunk);
            } else {
              accumulated += chunk;
              setStreamedContent(accumulated);
              // Extract title from first # heading
              if (!projectTitle) {
                const titleMatch = accumulated.match(/^#\s+(.+)$/m);
                if (titleMatch) setProjectTitle(titleMatch[1]!.trim());
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  useEffect(() => {
    if (step === 2) startGeneration();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => (step === 2 && !done ? null : step === 2 ? router.push("/projects") : router.push("/projects"))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Project</h1>
          <p className="text-xs text-muted-foreground">ZIMSEC Heritage-Based Curriculum</p>
        </div>
      </div>

      <StepBar step={step} />

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-up">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your candidate details. The AI will choose a topic and write your complete HBC project.
          </p>

          {/* Candidate info */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate Information</p>

            <Field label="Your Name" hint="(as on your exam slip)">
              <input className={INPUT_CLS} placeholder="e.g. Tendai Moyo" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Centre Number">
                <input className={INPUT_CLS} placeholder="e.g. 1234" value={centreNumber} onChange={(e) => setCentreNumber(e.target.value)} />
              </Field>
              <Field label="Candidate Number">
                <input className={INPUT_CLS} placeholder="e.g. 5678" value={candidateNumber} onChange={(e) => setCandidateNumber(e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Grade */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grade Level</p>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    grade === g
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS_BY_GRADE[grade].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                    subject === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Category</p>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`w-full text-left flex items-center gap-4 rounded-xl border-2 p-4 transition-all duration-150 ${cat.bg} ${
                    category === cat.id ? cat.activeBorder : cat.border
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cat.iconBg}`}>
                    <HugeiconsIcon icon={cat.icon} className={`h-5 w-5 ${cat.text}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${cat.text}`}>{cat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                  {category === cat.id && (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className={`ml-auto h-5 w-5 shrink-0 ${cat.text}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
          >
            <HugeiconsIcon icon={SparklesIcon} className="mr-2 h-4 w-4" />
            Generate Project
          </Button>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-up">
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" onClick={() => { setStep(1); setError(""); }}>
                Try Again
              </Button>
            </div>
          ) : done ? (
            /* ── Success ── */
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-fade-up">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Project ready</p>
                  <p className="text-xs text-muted-foreground">{subject} · {grade} · {category}</p>
                </div>
              </div>
              {projectTitle && (
                <p className="text-base font-bold text-foreground leading-snug">{projectTitle}</p>
              )}
              <div className="flex gap-3 pt-1">
                {projectId && (
                  <Button className="flex-1" onClick={() => router.push(`/projects/${projectId}`)}>
                    <HugeiconsIcon icon={Mortarboard01Icon} className="mr-2 h-4 w-4" />
                    View Project
                  </Button>
                )}
                {projectId && (
                  <Button variant="outline" asChild>
                    <a href={`${API}/projects/${projectId}/html`} target="_blank" rel="noopener noreferrer">
                      Download PDF
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* ── Generating ── */
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <HugeiconsIcon icon={SparklesIcon} className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Generating your project…</p>
                    <p className="text-xs text-muted-foreground">{subject} · {grade} · {category}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-[shimmer_2s_ease-in-out_infinite] w-1/2" />
                </div>
              </div>

              {/* Live preview */}
              {streamedContent && (
                <div className="rounded-2xl border border-border bg-card/50 p-5 max-h-72 overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <HugeiconsIcon icon={SparklesIcon} className="h-3 w-3 text-primary" />
                    Writing…
                  </p>
                  <div className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {streamedContent.slice(0, 600)}{streamedContent.length > 600 ? "…" : ""}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
