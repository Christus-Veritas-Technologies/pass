import { env } from "@pass/env/server";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;

// Re-export generated types so consumers can import them from "@pass/db"
// without reaching into the internal generated paths.
export type { Plan, ResourceType, SessionMode, IngestStatus, GuideSource, SubscriptionStatus, BillingCycle } from "../prisma/generated/enums";
export type { User, Resource, PaperQuestion, PaperSession, QuestionAttempt, Project, Subscription, PaymentTransaction, MonthlyUsage, ChatThread, ChatMessage } from "../prisma/generated/client";
export type { ChatRole } from "../prisma/generated/enums";
