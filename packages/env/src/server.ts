import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_URL: z.url(),

    // JWT — required
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),

    // Anthropic — optional (AI features disabled when absent)
    ANTHROPIC_API_KEY: z.string().optional(),

    // OpenRouter — optional. When set, project generation routes through
    // OpenRouter (DeepSeek V3.2, throughput-pinned). Falls back to Anthropic
    // Sonnet when absent. See apps/server/src/mastra/models.ts.
    OPENROUTER_API_KEY: z.string().optional(),

    // Google OAuth — optional (feature disabled when absent)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.url().optional(),

    // SMTP — optional (forgot-password disabled when absent)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),

    // Cloudflare R2 — optional (file uploads disabled when absent)
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),

    // Paynow Payment Gateway — optional (payments disabled when absent)
    PAYNOW_INTEGRATION_ID: z.string().optional(),
    PAYNOW_INTEGRATION_KEY: z.string().optional(),
    PAYNOW_RESULT_URL: z.string().optional(),
    PAYNOW_RETURN_URL: z.string().optional(),

    // WhatsApp bot — optional (bot disabled when WHATSAPP_ENABLED != "true")
    WHATSAPP_ENABLED:     z.enum(["true", "false"]).default("false"),
    WHATSAPP_SESSION_DIR: z.string().default("./.wwebjs_auth"),
    WHATSAPP_ADMIN_TOKEN: z.string().optional(), // gates GET /whatsapp/qr
    WHATSAPP_BOT_NUMBER:  z.string().optional(), // E.164, shown in welcome message

    // Web Push (VAPID) — optional (web push disabled when absent)
    VAPID_PUBLIC_KEY:  z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_EMAIL:       z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
