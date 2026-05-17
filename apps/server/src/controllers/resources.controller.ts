import type { Context } from "hono";

// Mock resource dataset — 15 varied resources across subjects/grades/types/years
const MOCK_RESOURCES = [
  { id: "r01", title: "Mathematics Paper 1", subject: "Mathematics", grade: "Form 4", year: 2023, type: "PAST_PAPER", fileUrl: "https://example.com/papers/math-p1-2023.pdf" },
  { id: "r02", title: "Mathematics Paper 1 Marking Scheme", subject: "Mathematics", grade: "Form 4", year: 2023, type: "MARKING_GUIDE", fileUrl: "https://example.com/papers/math-p1-2023-ms.pdf" },
  { id: "r03", title: "Mathematics Paper 2", subject: "Mathematics", grade: "Form 4", year: 2022, type: "PAST_PAPER", fileUrl: "https://example.com/papers/math-p2-2022.pdf" },
  { id: "r04", title: "English Language Paper 1", subject: "English Language", grade: "Form 4", year: 2023, type: "PAST_PAPER", fileUrl: "https://example.com/papers/eng-p1-2023.pdf" },
  { id: "r05", title: "English Language Marking Scheme 2023", subject: "English Language", grade: "Form 4", year: 2023, type: "MARKING_GUIDE", fileUrl: "https://example.com/papers/eng-p1-2023-ms.pdf" },
  { id: "r06", title: "Combined Science Paper 1", subject: "Combined Science", grade: "Form 4", year: 2023, type: "PAST_PAPER", fileUrl: "https://example.com/papers/sci-p1-2023.pdf" },
  { id: "r07", title: "Combined Science Syllabus 2021–2023", subject: "Combined Science", grade: "Form 4", year: 2021, type: "SYLLABUS", fileUrl: "https://example.com/syllabi/sci-syllabus.pdf" },
  { id: "r08", title: "History Paper 1", subject: "History", grade: "Form 4", year: 2022, type: "PAST_PAPER", fileUrl: "https://example.com/papers/hist-p1-2022.pdf" },
  { id: "r09", title: "Geography Paper 1", subject: "Geography", grade: "Form 4", year: 2023, type: "PAST_PAPER", fileUrl: "https://example.com/papers/geo-p1-2023.pdf" },
  { id: "r10", title: "Mathematics A-Level Paper 1", subject: "Mathematics", grade: "Form 6", year: 2023, type: "PAST_PAPER", fileUrl: "https://example.com/papers/math-al-p1-2023.pdf" },
  { id: "r11", title: "Chemistry Paper 1", subject: "Chemistry", grade: "Form 6", year: 2023, type: "PAST_PAPER", fileUrl: "https://example.com/papers/chem-p1-2023.pdf" },
  { id: "r12", title: "Chemistry Syllabus A-Level", subject: "Chemistry", grade: "Form 6", year: 2020, type: "SYLLABUS", fileUrl: "https://example.com/syllabi/chem-al-syllabus.pdf" },
  { id: "r13", title: "English Literature Paper 1", subject: "English Literature", grade: "Form 6", year: 2022, type: "PAST_PAPER", fileUrl: "https://example.com/papers/englit-p1-2022.pdf" },
  { id: "r14", title: "Biology Paper 1 Marking Scheme", subject: "Biology", grade: "Form 6", year: 2023, type: "MARKING_GUIDE", fileUrl: "https://example.com/papers/bio-p1-2023-ms.pdf" },
  { id: "r15", title: "Shona Paper 1", subject: "Shona", grade: "Form 4", year: 2022, type: "PAST_PAPER", fileUrl: "https://example.com/papers/shona-p1-2022.pdf" },
];

const PAGE_SIZE = 20;

export async function getResources(c: Context) {
  const { subject, grade, type, year, page: pageStr } = c.req.query() as {
    subject?: string;
    grade?: string;
    type?: string;
    year?: string;
    page?: string;
  };

  let results = MOCK_RESOURCES.slice();

  if (subject) results = results.filter((r) => r.subject.toLowerCase() === subject.toLowerCase());
  if (grade) results = results.filter((r) => r.grade.toLowerCase() === grade.toLowerCase());
  if (type) results = results.filter((r) => r.type === type.toUpperCase());
  if (year) results = results.filter((r) => r.year === Number(year));

  const page = Math.max(1, Number(pageStr ?? 1));
  const total = results.length;
  const data = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return c.json({ resources: data, total, page, pageSize: PAGE_SIZE });
}

export async function getResource(c: Context) {
  const id = c.req.param("id");
  const resource = MOCK_RESOURCES.find((r) => r.id === id);
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  return c.json({ resource });
}

export async function downloadResource(c: Context) {
  const id = c.req.param("id");
  const resource = MOCK_RESOURCES.find((r) => r.id === id);
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  // Placeholder — returns the stored fileUrl; swap for signed URL once storage is in place
  return c.json({ downloadUrl: resource.fileUrl });
}

export async function getFeaturedResources(c: Context) {
  const resources = [
    MOCK_RESOURCES.find((r) => r.id === "r01")!,
    MOCK_RESOURCES.find((r) => r.id === "r04")!,
    MOCK_RESOURCES.find((r) => r.id === "r11")!,
  ];
  return c.json({ resources });
}
