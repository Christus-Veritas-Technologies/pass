import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";
import { paynow, PLAN_PRICES, PLAN_DESCRIPTIONS } from "../lib/paynow";
import { getSubscriptionInfo } from "../lib/subscriptions";
import { sendEmail } from "../lib/emails";

const createPaymentSchema = z.object({
  plan: z.enum(["STUDY", "PASS"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
});

/**
 * Create a Paynow payment for upgrading to a paid plan.
 * POST /api/payments/create
 */
export async function createPayment(c: Context): Promise<Response> {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();

    // Validate request
    const { plan, billingCycle } = createPaymentSchema.parse(body);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 400);
    }

    // Get price
    const amount = PLAN_PRICES[plan]?.[billingCycle];
    if (!amount) {
      return c.json({ error: "Invalid plan" }, 400);
    }

    // Create PaymentTransaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId,
        amount,
        plan,
        billingCycle,
        status: "pending",
      },
    });

    // Create Paynow payment
    const payment = paynow.createPayment(transaction.id, user.email);
    payment.add(PLAN_DESCRIPTIONS[plan]?.[billingCycle] ?? plan, amount);

    // Send to Paynow
    const response = await paynow.send(payment);

    if (!response.success) {
      // Update transaction to failed
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "failed" },
      });

      return c.json(
        {
          error: "Failed to initiate payment",
          details: response.error,
        },
        400
      );
    }

    // Update transaction with Paynow details
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        paynowRef: response.reference || transaction.id,
        redirectUrl: response.redirectUrl,
        pollUrl: response.pollUrl,
      },
    });

    return c.json({
      success: true,
      redirectUrl: response.redirectUrl,
      paynowRef: response.reference || transaction.id,
      pollUrl: response.pollUrl,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

/**
 * Webhook handler for Paynow payment notifications.
 * POST /api/payments/webhook
 * Public endpoint (no auth required).
 */
export async function handlePaymentWebhook(c: Context): Promise<Response> {
  try {
    const body = await c.req.text();

    // TODO: Verify Paynow signature
    // For now, parse the webhook payload
    const params = new URLSearchParams(body);

    const reference = params.get("reference");
    const status = params.get("status")?.toLowerCase();

    if (!reference) {
      return c.json({ error: "Missing reference" }, 400);
    }

    // Find the transaction
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { paynowRef: reference },
    });

    if (!transaction) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    // Update transaction status
    if (status === "paid") {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      });

      // Create subscription — expiry depends on billing cycle
      const startDate = new Date();
      const days = transaction.billingCycle === "ANNUAL" ? 365 : 30;
      const expiryDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { userId: transaction.userId },
        create: {
          userId: transaction.userId,
          plan: transaction.plan,
          billingCycle: transaction.billingCycle,
          startDate,
          expiryDate,
          paynowRef: reference,
          paynowStatus: "paid",
        },
        update: {
          plan: transaction.plan,
          billingCycle: transaction.billingCycle,
          status: "ACTIVE",
          startDate,
          expiryDate,
          paynowRef: reference,
          paynowStatus: "paid",
          renewalDue: false,
        },
      });

      // Update user plan
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { plan: transaction.plan },
      });

      // Send confirmation email
      const user = await prisma.user.findUnique({
        where: { id: transaction.userId },
      });

      if (user) {
        await sendEmail(user.email, "Payment Confirmed", {
          template: "payment_confirmed",
          plan: transaction.plan,
          expiryDate,
        });
      }
    } else if (status === "failed") {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "failed" },
      });
    }

    // Return 200 OK (Paynow expects 200)
    return c.text("OK", 200);
  } catch (error) {
    console.error("Error handling payment webhook:", error);
    return c.text("Error", 500);
  }
}

/**
 * Poll transaction status.
 * GET /api/payments/status/:transactionRef
 */
export async function pollTransactionStatus(c: Context): Promise<Response> {
  try {
    const ref = c.req.param("transactionRef") as string;

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [{ paynowRef: ref }, { id: ref }],
      },
    });

    if (!transaction) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    if (!transaction.pollUrl) {
      return c.json({ error: "Poll URL not available" }, 400);
    }

    // Poll Paynow
    const status = await paynow.pollTransaction(transaction.pollUrl);
    // Handle both paynow library versions: paid() method or status string property
    const isPaid = typeof status.paid === "function" ? status.paid() : status.status?.toLowerCase() === "paid";

    // Update transaction
    if (isPaid) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      });

      // Create subscription if not exists
      const sub = await prisma.subscription.findUnique({
        where: { userId: transaction.userId },
      });

      if (!sub) {
        const startDate = new Date();
        const days = transaction.billingCycle === "ANNUAL" ? 365 : 30;
        const expiryDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

        await prisma.subscription.create({
          data: {
            userId: transaction.userId,
            plan: transaction.plan,
            billingCycle: transaction.billingCycle,
            startDate,
            expiryDate,
            paynowRef: transaction.paynowRef,
            paynowStatus: "paid",
          },
        });

        await prisma.user.update({
          where: { id: transaction.userId },
          data: { plan: transaction.plan },
        });
      }
    }

    return c.json({
      status: isPaid ? "paid" : "pending",
      isPaid,
    });
  } catch (error) {
    console.error("Error polling transaction:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

/**
 * Get subscription renewal status.
 * GET /api/payments/renewal-status
 */
export async function getRenewalStatus(c: Context): Promise<Response> {
  try {
    const userId = c.get("userId") as string;

    const sub = await getSubscriptionInfo(userId);

    if (!sub) {
      return c.json({ error: "No active subscription" }, 404);
    }

    return c.json(sub);
  } catch (error) {
    console.error("Error getting renewal status:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

/**
 * Initiate renewal payment.
 * POST /api/payments/renew
 */
export async function renewSubscription(c: Context): Promise<Response> {
  try {
    const userId = c.get("userId") as string;

    const sub = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub) {
      return c.json({ error: "No active subscription" }, 404);
    }

    return c.json({
      redirectTo: `/checkout?plan=${sub.plan}&billing=${sub.billingCycle}`,
    });
  } catch (error) {
    console.error("Error initiating renewal:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

/**
 * Get payment history for a user.
 * GET /api/payments/history
 */
export async function getPaymentHistory(c: Context): Promise<Response> {
  try {
    const userId = c.get("userId") as string;

    const transactions = await prisma.paymentTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return c.json(transactions);
  } catch (error) {
    console.error("Error getting payment history:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}
