"use client";

import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Folder01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pass/ui/components/button";
import { Card, CardContent } from "@pass/ui/components/card";
import { getAccessToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_SERVER_URL;

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "Grade 7": ["Heritage Studies", "Mathematics", "English", "Science", "Shona/Ndebele"],
  "Form 4": ["History", "Combined Science", "Agriculture", "Biology", "Chemistry", "Geography", "Shona", "English Literature"],
  "Form 6": ["History", "Geography", "Sociology", "Agriculture", "Biology", "Chemistry", "Physics"],
};

const GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

const CATEGORIES = [
  { id: "Culture & History", emoji: "🏺", title: "Culture & History", desc: "Totems, liberation struggle, customs, languages" },
  { id: "Indigenous Sciences", emoji: "🌿", title: "Indigenous Sciences", desc: "Traditional medicine, farming, energy systems" },
  { id: "Arts & Lifestyle", emoji: "🎭", title: "Arts & Lifestyle", desc: "Music, architecture, food, traditional games" },
] as const;

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

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 form state
  const [studentName, setStudentName] = useState("");
  const [centreNumber, setCentreNumber] = useState("");
  const [candidateNumber, setCandidateNumber] = useState("");
  const [grade, setGrade] = useState<string>(GRADES[1]);
  const [subject, setSubject] = useState<string>(SUBJECTS_BY_GRADE["Form 4"][0]);
  const [category, setCategory] = useState<string>("");

  // Step 2 generation state
  const [projectId, setProjectId] = useState("");
  const [streamedContent, setStreamedContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [genError, setGenError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Update subject when grade changes
  function handleGradeChange(g: string) {
    setGrade(g);
    setSubject(SUBJECTS_BY_GRADE[g][0]);
  }

  const canContinue = studentName.trim() && centreNumber.trim() && candidateNumber.trim() && grade && subject && category;

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
        body: JSON.stringify({ studentName, centreNumber, candidateNumber, grade, subject, category }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Generation failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let newProjectId = "";

      while (reader) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (currentEvent === "project_id") {
              newProjectId = data;
              setProjectId(data);
            } else if (currentEvent === "chunk") {
              setStreamedContent((prev) => prev + data);
            } else if (currentEvent === "done") {
              setDone(true);
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

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => (step === 2 && !done ? null : step === 2 ? router.push("/projects") : router.push("/projects"))}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-muted transition-colors"
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
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Tendai Moyo"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Centre Number</label>
              <input
                type="text"
                placeholder="e.g. 1234"
                value={centreNumber}
                onChange={(e) => setCentreNumber(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Candidate Number</label>
              <input
                type="text"
                placeholder="e.g. 5678"
                value={candidateNumber}
                onChange={(e) => setCandidateNumber(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</label>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGradeChange(g)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(SUBJECTS_BY_GRADE[grade] ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
            <div className="grid gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    category === cat.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl leading-none mt-0.5">{cat.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{cat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!canContinue}
            onClick={() => setStep(2)}
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
                <div className="flex gap-3 w-full">
                  <Button className="flex-1" onClick={() => router.push(`/projects/${projectId}`)}>
                    <HugeiconsIcon icon={Folder01Icon} className="mr-2 h-4 w-4" />
                    View Project
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`${API}/projects/${projectId}/html?token=${getAccessToken()}`, "_blank")}
                  >
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl">
              <CardContent className="py-6 flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                  <HugeiconsIcon icon={SparklesIcon} className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Generating your project…</p>
                <p className="text-xs text-muted-foreground">This takes about 30–60 seconds</p>
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
