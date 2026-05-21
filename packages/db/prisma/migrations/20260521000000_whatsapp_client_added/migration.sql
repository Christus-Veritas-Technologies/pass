-- AlterTable: User — add WhatsApp linking fields
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "whatsappId" TEXT,
ADD COLUMN "whatsappLinkedAt" TIMESTAMP(3);

-- AlterTable: MonthlyUsage — add AI message usage counter
ALTER TABLE "MonthlyUsage" ADD COLUMN "aiMessagesUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WhatsappConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "whatsappId" TEXT NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappLinkCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappLinkCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappId_key" ON "User"("whatsappId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConversation_userId_key" ON "WhatsappConversation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConversation_whatsappId_key" ON "WhatsappConversation"("whatsappId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_whatsappId_idx" ON "WhatsappConversation"("whatsappId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappLinkCode_code_key" ON "WhatsappLinkCode"("code");

-- CreateIndex
CREATE INDEX "WhatsappLinkCode_userId_idx" ON "WhatsappLinkCode"("userId");

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappLinkCode" ADD CONSTRAINT "WhatsappLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
