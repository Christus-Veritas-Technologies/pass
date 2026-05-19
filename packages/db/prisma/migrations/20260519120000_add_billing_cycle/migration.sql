-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable: Subscription
ALTER TABLE "Subscription" ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable: PaymentTransaction
ALTER TABLE "PaymentTransaction" ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';
