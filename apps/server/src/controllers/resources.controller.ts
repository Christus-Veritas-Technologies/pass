import type { Context } from "hono";

import prisma from "@pass/db";

const PAGE_SIZE = 20;

export async function getResources(c: Context): Promise<Response> {
  const { subject, grade, type, year, page: pageStr } = c.req.query() as {
    subject?: string;
    grade?: string;
    type?: string;
    year?: string;
    page?: string;
  };

  const where: Record<string, unknown> = {};
  if (subject) where.subject = { equals: subject, mode: "insensitive" };
  if (grade) where.grade = { equals: grade, mode: "insensitive" };
  if (type) where.type = type.toUpperCase();
  if (year) where.year = Number(year);

  // Pagination is opt-in: the resources UIs do client-side search/filter
  // and need the full catalogue, so without an explicit ?page they get all.
  const paginate = pageStr !== undefined;
  const page = Math.max(1, Number(pageStr ?? 1));

  const [data, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      ...(paginate ? { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE } : {}),
      orderBy: [{ year: "desc" }, { subject: "asc" }],
    }),
    prisma.resource.count({ where }),
  ]);

  return c.json({ resources: data, total, page, pageSize: paginate ? PAGE_SIZE : total });
}

export async function getResource(c: Context): Promise<Response> {
  const id = c.req.param("id");
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  return c.json({ resource });
}

export async function downloadResource(c: Context): Promise<Response> {
  const id = c.req.param("id");
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  return c.json({ downloadUrl: resource.fileUrl });
}

export async function getFeaturedResources(c: Context): Promise<Response> {
  const resources = await prisma.resource.findMany({
    where: { type: "PAST_PAPER" },
    orderBy: { year: "desc" },
    take: 3,
  });
  return c.json({ resources });
}
