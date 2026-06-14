import { test, expect, describe, mock } from "bun:test";

/**
 * Unit test for the in-app attachment context loaders. Prisma is mocked so we
 * can assert formatting and, crucially, ownership scoping: a session/project
 * belonging to another user must resolve to null (no cross-user leak).
 */

const paperSessionFindFirst = mock(
  async ({ where }: { where: { id: string; userId: string } }) => {
    if (where.userId !== "owner") return null;
    return {
      id: where.id,
      questionsAnswered: 1,
      resource: { title: "Biology 2023 P1", subject: "Biology", grade: "O-Level" },
      questionAttempts: [
        { questionNumber: 1, questionText: "Define osmosis", userAnswer: "water moving", correct: false, evaluation: { feedback: "Mention semipermeable membrane" } },
      ],
    };
  },
);

const projectFindFirst = mock(async ({ where }: { where: { id: string; userId: string } }) => {
  if (where.userId !== "owner") return null;
  return { id: where.id, subject: "Geography", grade: "Form 4", topic: "Soil erosion", content: "My project body" };
});

const resourceFindUnique = mock(async ({ where }: { where: { id: string } }) => {
  if (where.id !== "r1") return null;
  return {
    id: "r1",
    title: "Biology 2023 P1",
    subject: "Biology",
    grade: "O-Level",
    year: 2023,
    type: "PAST_PAPER",
    questionCount: 1,
    questions: [{ questionNumber: 1, text: "Define osmosis", marks: 2, aiModelAnswer: "Movement of water…" }],
  };
});

mock.module("@pass/db", () => ({
  default: {
    paperSession: { findFirst: paperSessionFindFirst },
    project: { findFirst: projectFindFirst },
    resource: { findUnique: resourceFindUnique },
  },
}));

const { loadAttachmentContext, buildAttachmentContext } = await import("./chatContext");

describe("chatContext loaders", () => {
  test("paper formats title + questions + model points", async () => {
    const block = await loadAttachmentContext({ kind: "paper", refId: "r1" }, "owner");
    expect(block).toContain("Biology 2023 P1");
    expect(block).toContain("Q1 (2m): Define osmosis");
    expect(block).toContain("Model points");
  });

  test("session owned by the user is loaded with feedback", async () => {
    const block = await loadAttachmentContext({ kind: "session", refId: "s1" }, "owner");
    expect(block).toContain("Your practice session");
    expect(block).toContain("→ incorrect");
    expect(block).toContain("semipermeable membrane");
  });

  test("session owned by another user resolves to null", async () => {
    const block = await loadAttachmentContext({ kind: "session", refId: "s1" }, "intruder");
    expect(block).toBeNull();
  });

  test("project owned by another user resolves to null", async () => {
    const block = await loadAttachmentContext({ kind: "project", refId: "p1" }, "intruder");
    expect(block).toBeNull();
  });

  test("buildAttachmentContext drops null (unowned) blocks", async () => {
    const combined = await buildAttachmentContext(
      [
        { kind: "paper", refId: "r1" },
        { kind: "project", refId: "p1" }, // not owned by "intruder" → dropped
      ],
      "intruder",
    );
    expect(combined).toContain("Biology 2023 P1");
    expect(combined).not.toContain("Soil erosion");
  });
});
