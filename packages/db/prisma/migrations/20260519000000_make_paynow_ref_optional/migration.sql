-- AlterTable: make paynowRef optional on PaymentTransaction
-- Previously required at creation time, but Paynow reference is only
-- available after the Paynow SDK call succeeds.
ALTER TABLE "PaymentTransaction" ALTER COLUMN "paynowRef" DROP NOT NULL;
