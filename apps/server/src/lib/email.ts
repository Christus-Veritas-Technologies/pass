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

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pass</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;border-radius:12px 12px 0 0;padding:28px 36px;">
              <span style="font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">Pass</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:36px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                Pass &mdash; ZIMSEC study platform<br />
                You received this email because an action was taken on your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#4F46E5;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.1px;">${label}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 20px 0;font-size:15px;color:#374151;line-height:1.65;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />`;
}

function note(text: string): string {
  return `<p style="margin:20px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;">${text}</p>`;
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  const html = layout(`
    ${heading("Reset your password")}
    ${para("We received a request to reset the password for your Pass account. Click the button below to choose a new one.")}
    <div style="margin:28px 0;">${btn(resetUrl, "Reset password")}</div>
    ${divider()}
    ${note("This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email &mdash; your account has not been changed.")}
    ${note(`Or copy and paste this URL: <span style="color:#4F46E5;">${resetUrl}</span>`)}
  `);

  const text = `Reset your Pass password\n\nClick this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`;

  await createTransport().sendMail({
    from: `"Pass" <${env.EMAIL_FROM}>`,
    to,
    subject: "Reset your password — Pass",
    text,
    html,
  });
}
