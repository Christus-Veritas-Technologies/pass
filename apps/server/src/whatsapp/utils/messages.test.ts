import { test, expect, describe } from "bun:test";
import {
  projectReviewMessage,
  PROJECT_CONFIRM_PROMPT,
  papersQuotaMessage,
  projectsQuotaMessage,
} from "./messages";

const slots = {
  studentName: "Tendai Moyo",
  schoolName: "Harare High School",
  centreNumber: "1234",
  candidateNumber: "5678",
  grade: "Form 4",
  subject: "Biology",
  category: "Indigenous Sciences",
  title: "",
  outline: "",
};

describe("projectReviewMessage", () => {
  test("echoes every collected field for review", () => {
    const m = projectReviewMessage(slots);
    expect(m).toContain("Tendai Moyo");
    expect(m).toContain("Harare High School");
    expect(m).toContain("1234");
    expect(m).toContain("5678");
    expect(m).toContain("Form 4");
    expect(m).toContain("Biology");
  });
  test("signals AI topic choice when no title was given", () => {
    expect(projectReviewMessage(slots)).toContain("I'll choose a topic");
  });
  test("notes a supplied outline will be followed", () => {
    expect(projectReviewMessage({ ...slots, outline: "1. intro\n2. method" })).toContain("outline will be followed");
  });
});

describe("PROJECT_CONFIRM_PROMPT", () => {
  test("offers the three actions", () => {
    expect(PROJECT_CONFIRM_PROMPT).toContain("GENERATE");
    expect(PROJECT_CONFIRM_PROMPT).toContain("EDIT");
    expect(PROJECT_CONFIRM_PROMPT).toContain("CANCEL");
  });
});

describe("quota walls", () => {
  test("an upgradeable plan is told the limit and how to upgrade", () => {
    const m = papersQuotaMessage("FREE", 5);
    expect(m).toContain("5");
    expect(m.toUpperCase()).toContain("UPGRADE");
  });
  test("the top plan is told when the quota resets (no upgrade)", () => {
    expect(projectsQuotaMessage("PASS", 12)).toContain("resets");
  });
});
