import type { Context } from "hono";

export async function getResources(c: Context) {
  return c.json({ message: "getResources" });
}

export async function getResource(c: Context) {
  return c.json({ message: "getResource", id: c.req.param("id") });
}

export async function getFeaturedResources(c: Context) {
  // Mock data — replace with real DB query once Prisma is connected
  const resources = [
    {
      id: "res_1",
      title: "Mathematics Revision Notes",
      subject: "Mathematics",
      type: "notes",
      grade: "Form 4",
      description: "Comprehensive O-Level maths notes covering algebra, geometry, and statistics.",
    },
    {
      id: "res_2",
      title: "English Essay Writing Guide",
      subject: "English Language",
      type: "guide",
      grade: "Form 4",
      description: "Step-by-step guide to writing high-scoring essays for ZIMSEC O-Level.",
    },
    {
      id: "res_3",
      title: "Chemistry Periodic Table Flashcards",
      subject: "Chemistry",
      type: "flashcards",
      grade: "Form 5",
      description: "Element symbols, atomic numbers, and key properties for A-Level Chemistry.",
    },
  ];

  return c.json({ resources });
}
