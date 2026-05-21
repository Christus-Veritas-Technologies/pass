/**
 * WhatsApp / phone number normalisation helpers.
 * wwebjs uses IDs like "263771234567@c.us" (no +, @c.us suffix).
 * We store E.164 in User.phone e.g. "+263771234567".
 */

export function whatsappIdToE164(whatsappId: string): string {
  const digits = whatsappId.replace(/@.*$/, "").replace(/\D/g, "");
  return `+${digits}`;
}

export function e164ToWhatsappId(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@c.us`;
}
