import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import {
  createPayment,
  handlePaymentWebhook,
  pollTransactionStatus,
  getRenewalStatus,
  renewSubscription,
  getPaymentHistory,
} from "../controllers/payments.controller";

export const paymentsRouter = new Hono();

/**
 * POST /api/payments/create
 * Requires authentication
 * Create a new payment for upgrading to a paid plan
 */
paymentsRouter.post("/create", requireAuth(), createPayment);

/**
 * POST /api/payments/webhook
 * Public endpoint (no authentication)
 * Webhook handler for Paynow payment notifications
 */
paymentsRouter.post("/webhook", handlePaymentWebhook);

/**
 * GET /api/payments/status/:transactionRef
 * Poll the status of a transaction
 */
paymentsRouter.get("/status/:transactionRef", pollTransactionStatus);

/**
 * GET /api/payments/renewal-status
 * Requires authentication
 * Get subscription renewal status for the current user
 */
paymentsRouter.get("/renewal-status", requireAuth(), getRenewalStatus);

/**
 * POST /api/payments/renew
 * Requires authentication
 * Initiate renewal payment
 */
paymentsRouter.post("/renew", requireAuth(), renewSubscription);

/**
 * GET /api/payments/history
 * Requires authentication
 * Get payment transaction history
 */
paymentsRouter.get("/history", requireAuth(), getPaymentHistory);

export default paymentsRouter;
