import nodemailer from "nodemailer";
import { env } from "@pass/env/server";

export function isEmailConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM);
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  await createTransport().sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your password — Pass",
    text: `Reset your Pass password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    html: `
      <p>You requested a password reset for your Pass account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}
