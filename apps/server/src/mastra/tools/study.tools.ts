import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import prisma from "@pass/db";

export const lookupResourceTool = createTool({
  id: "lookup-resource",
  description: "Fetches a ZIMSEC past paper or resource from the database by its ID, including title, subject, grade, year, and type.",
  inputSchema: z.object({
    resourceId: z.string().describe("The ID of the resource to look up"),
  }),
  execute: async ({ context }) => {
    const resource = await prisma.resource.findUnique({
      where: { id: context.resourceId },
    });
    return resource ?? { error: "Resource not found" };
  },
});

export const getSessionProgressTool = createTool({
  id: "get-session-progress",
  description: "Gets the current paper session state including all previously attempted questions and their evaluations.",
  inputSchema: z.object({
    sessionId: z.string().describe("The ID of the paper session"),
  }),
  execute: async ({ context }) => {
    const session = await prisma.paperSession.findUnique({
      where: { id: context.sessionId },
      include: {
        resource: true,
        questionAttempts: {
          orderBy: { questionNumber: "asc" },
        },
      },
    });
    return session ?? { error: "Session not found" };
  },
});
