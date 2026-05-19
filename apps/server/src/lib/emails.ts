/**
 * Email utility functions for sending transactional emails.
 * Supports:
 * - Payment confirmation
 * - Renewal reminders (7 days before, 1 day before)
 * - Plan expired notification
 */

interface EmailOptions {
  template: string;
  plan?: string;
  daysLeft?: number;
  expiryDate?: Date;
  renewalUrl?: string;
  upgradeUrl?: string;
}

/**
 * Send an email to a user.
 * Currently a stub implementation — in production, would integrate with SMTP.
 */
export async function sendEmail(
  to: string,
  subject: string,
  options: EmailOptions
): Promise<void> {
  // TODO: Implement SMTP email sending using SMTP_HOST, SMTP_USER, SMTP_PASS from env
  // For now, just log the email
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`, options);

  // Example implementation would be:
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: parseInt(process.env.SMTP_PORT || "587"),
  //   secure: false,
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });
  // await transporter.sendMail({
  //   from: process.env.EMAIL_FROM,
  //   to,
  //   subject,
  //   html: generateEmailHtml(options),
  // });
}

export function generateEmailHtml(options: EmailOptions): string {
  switch (options.template) {
    case "payment_confirmed":
      return `
        <h1>Payment Confirmed!</h1>
        <p>Thank you for upgrading to the ${options.plan} plan.</p>
        <p>Your subscription expires on: ${options.expiryDate?.toLocaleDateString()}</p>
      `;
    case "renewal_reminder":
      return `
        <h1>Subscription Renewal Reminder</h1>
        <p>Your ${options.plan} plan expires in ${options.daysLeft} days.</p>
        <p><a href="${options.renewalUrl}">Renew your subscription</a></p>
      `;
    case "subscription_expired":
      return `
        <h1>Your Subscription Has Expired</h1>
        <p>Your paid plan has expired. You're now on the FREE plan.</p>
        <p><a href="${options.upgradeUrl}">Upgrade your plan</a></p>
      `;
    default:
      return "<p>Email</p>";
  }
}
