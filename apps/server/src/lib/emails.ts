/**
 * Transactional email templates for Pass — payment & subscription events.
 * All emails use the same branded layout: indigo header, white body, grey footer.
 * No emoji. Professional tone matched to the Pass UI.
 */

import nodemailer from "nodemailer";
import { env } from "@pass/env/server";

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

// ─── Shared layout primitives ─────────────────────────────────────────────────

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

function btn(href: string, label: string, color = "#4F46E5"): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.1px;">${label}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 20px 0;font-size:15px;color:#374151;line-height:1.65;">${text}</p>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;font-size:14px;color:#6B7280;width:140px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;font-size:14px;color:#111827;font-weight:500;">${value}</td>
    </tr>`;
}

function infoTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 28px 0;">${rows}</table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />`;
}

function note(text: string): string {
  return `<p style="margin:20px 0 0 0;font-size:13px;color:#9CA3AF;line-height:1.5;">${text}</p>`;
}

function planBadge(plan: string): string {
  const color = plan === "PASS" ? "#7C3AED" : "#059669";
  return `<span style="display:inline-block;background:${color}18;color:${color};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.2px;">${plan} Plan</span>`;
}

function urgentBanner(text: string): string {
  return `<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#92400E;font-weight:500;">${text}</p>
  </div>`;
}

// ─── Email functions ──────────────────────────────────────────────────────────

export async function sendPaymentConfirmedEmail(
  to: string,
  opts: { plan: string; expiryDate: Date; dashboardUrl?: string },
): Promise<void> {
  const { plan, expiryDate, dashboardUrl = `${env.APP_URL}/dashboard` } = opts;
  const expiry = expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const html = layout(`
    ${heading("Your subscription is active")}
    ${para(`Thank you for subscribing to Pass. Your ${planBadge(plan)} is now active and you have full access to all included features.`)}
    ${infoTable(
      infoRow("Plan", `${plan} Plan`) +
      infoRow("Billing", "Monthly") +
      infoRow("Renews", expiry)
    )}
    <div style="margin:28px 0;">${btn(dashboardUrl, "Go to your dashboard")}</div>
    ${divider()}
    ${note("If you have any questions about your subscription, reply to this email and we will help you.")}
  `);

  const text = `Your Pass subscription is active.\n\nPlan: ${plan}\nRenews: ${expiry}\n\nHead to your dashboard: ${dashboardUrl}`;

  await createTransport().sendMail({
    from: `"Pass" <${env.EMAIL_FROM}>`,
    to,
    subject: `Your ${plan} Plan is active — Pass`,
    text,
    html,
  });
}

export async function sendRenewalReminderEmail(
  to: string,
  opts: { plan: string; daysLeft: number; expiryDate: Date; renewalUrl?: string },
): Promise<void> {
  const { plan, daysLeft, expiryDate, renewalUrl = `${env.APP_URL}/pricing` } = opts;
  const expiry = expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const isUrgent = daysLeft <= 1;

  const html = layout(`
    ${isUrgent
      ? urgentBanner(`Your subscription expires tomorrow. Renew now to keep your ${plan} Plan access.`)
      : ""}
    ${heading(isUrgent ? "Your plan expires tomorrow" : `Your plan expires in ${daysLeft} days`)}
    ${para(`Your ${planBadge(plan)} subscription expires on ${expiry}. Renew before that date to keep uninterrupted access to all your past papers, AI marking, and study tools.`)}
    ${infoTable(
      infoRow("Plan", `${plan} Plan`) +
      infoRow("Expiry date", expiry) +
      infoRow("Days remaining", String(daysLeft))
    )}
    <div style="margin:28px 0;">${btn(renewalUrl, "Renew my subscription", isUrgent ? "#DC2626" : "#4F46E5")}</div>
    ${divider()}
    ${note("If you do not renew, your account will revert to the free plan on your expiry date. Your study history will be preserved.")}
  `);

  const text = `Your Pass ${plan} Plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${expiry}).\n\nRenew here: ${renewalUrl}`;

  await createTransport().sendMail({
    from: `"Pass" <${env.EMAIL_FROM}>`,
    to,
    subject: isUrgent
      ? `Your ${plan} Plan expires tomorrow — renew now`
      : `Your ${plan} Plan expires in ${daysLeft} days — Pass`,
    text,
    html,
  });
}

export async function sendSubscriptionExpiredEmail(
  to: string,
  opts: { plan: string; upgradeUrl?: string },
): Promise<void> {
  const { plan, upgradeUrl = `${env.APP_URL}/pricing` } = opts;

  const html = layout(`
    ${heading("Your subscription has ended")}
    ${para(`Your ${planBadge(plan)} subscription has expired. Your account has been moved to the free plan.`)}
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px 24px;margin:20px 0 28px 0;">
      <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">What changes on free</p>
      <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#374151;line-height:1.7;">
        <li>3 past papers per month</li>
        <li>1 AI study project per month</li>
        <li>Standard AI feedback</li>
      </ul>
    </div>
    <div style="margin:0 0 28px 0;">${btn(upgradeUrl, "Renew my subscription")}</div>
    ${divider()}
    ${note("Your study history, saved papers, and past project guides are all still available. Upgrading will restore your full access immediately.")}
  `);

  const text = `Your Pass ${plan} Plan has expired. Your account is now on the free plan.\n\nRenew here to restore full access: ${upgradeUrl}`;

  await createTransport().sendMail({
    from: `"Pass" <${env.EMAIL_FROM}>`,
    to,
    subject: `Your ${plan} Plan has expired — Pass`,
    text,
    html,
  });
}

// ─── Legacy stub kept for backwards compat ────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  opts: { template: string; plan?: string; daysLeft?: number; expiryDate?: Date; renewalUrl?: string; upgradeUrl?: string },
): Promise<void> {
  switch (opts.template) {
    case "payment_confirmed":
      if (opts.plan && opts.expiryDate)
        return sendPaymentConfirmedEmail(to, { plan: opts.plan, expiryDate: opts.expiryDate });
      break;
    case "renewal_reminder":
      if (opts.plan && opts.daysLeft !== undefined && opts.expiryDate)
        return sendRenewalReminderEmail(to, { plan: opts.plan, daysLeft: opts.daysLeft, expiryDate: opts.expiryDate, renewalUrl: opts.renewalUrl });
      break;
    case "subscription_expired":
      if (opts.plan)
        return sendSubscriptionExpiredEmail(to, { plan: opts.plan, upgradeUrl: opts.upgradeUrl });
      break;
  }
  console.log(`[EMAIL] Unhandled template "${opts.template}" for ${to}, subject: ${subject}`);
}
