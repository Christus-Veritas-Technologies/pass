# WhatsApp Client — Authentication Plan

This document describes how authentication will work when the WhatsApp client is implemented. The client itself does not exist yet — see `WHATSAPP_PLAN.md` for the broader implementation roadmap.

---

## User Types and Login Flows

### 1. Email/Password Users

Users who registered with an email and password (`passwordHash` is non-null in the DB).

**Flow:**

1. User sends their first message (or the bot prompts on "login").
2. Bot replies: "Please enter your email address."
3. User sends email → bot replies: "Enter your password."
4. User sends password → server calls `POST /auth/login` (existing endpoint).
5. On success: store `userId` in the WhatsApp conversation session (see Session Storage below).
6. On failure: "Incorrect credentials. Try again." (rate-limited — see Security).

---

### 2. Google-Only Users (No Password Set)

Users whose account was created via Google OAuth (`passwordHash` is null in the DB).

These users cannot supply a password — instead they authenticate via a one-time PIN (OTP) sent to their registered email address.

**Flow:**

1. User sends email → server checks DB.
2. If `passwordHash IS NULL` for that email:
   - Generate a 6-digit OTP, store it in the `WhatsappOtp` table (see Schema below) with a 10-minute expiry and a max-attempt counter.
   - Send OTP to the user's email via the existing mailer.
   - Bot replies: "We sent a 6-digit code to `<email>`. Enter it here to sign in."
3. User enters the 6-digit code.
4. Server verifies against the `WhatsappOtp` table:
   - If valid and not expired: mark as used, store `userId` in the session.
   - If invalid: decrement remaining attempts, reply "Incorrect code. X attempts remaining."
   - If expired: reply "Code expired. Type `login` to request a new one."
   - If attempts exhausted (> 3): lock the OTP row, reply "Too many attempts. Please try again in 15 minutes."

**Schema addition (`WhatsappOtp` table):**

```prisma
model WhatsappOtp {
  id          String   @id @default(cuid())
  userId      String
  code        String   // 6-digit string, stored hashed (bcrypt)
  expiresAt   DateTime
  attemptsLeft Int     @default(3)
  used        Boolean  @default(false)
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Alternatively, a `whatsappOtp` column on the `User` model is acceptable for a simpler initial implementation if the table overhead is undesirable, but the dedicated table is preferred because it allows multiple outstanding codes per user (e.g., re-send before expiry) and keeps the User model clean.

---

## Session Storage

Once authenticated, the `userId` is associated with the WhatsApp conversation. The storage key is the WhatsApp phone number (E.164 format), which is stable for a given user.

**Recommended approach:** a `WhatsappSession` table:

```prisma
model WhatsappSession {
  id          String   @id @default(cuid())
  phoneNumber String   @unique  // E.164, e.g. "+263771234567"
  userId      String
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- Session TTL: **30 days** from last activity (rolling). Reset `expiresAt` on every authenticated message.
- If `expiresAt` is in the past when a message arrives, treat the session as expired and prompt re-authentication.
- If the user sends "logout" (case-insensitive), delete the row and reply "You have been signed out."

---

## Re-authentication

| Trigger | Bot Action |
|---|---|
| No session for this phone number | Prompt email → password / OTP flow |
| Session row found but `expiresAt` is past | Delete stale row, prompt re-auth |
| User sends "logout" | Delete session row, confirm sign-out |
| 5 consecutive API 401s during a session | Invalidate local session, prompt re-auth |

---

## Security

### Rate Limiting

- **Login attempts (password):** max 5 failed attempts per phone number per 15-minute window. After lockout: "Too many failed attempts. Please try again after `<time>`."
- **OTP requests:** max 3 OTP sends per phone number per hour. Prevents email flooding.
- **OTP verification attempts:** max 3 per OTP token (stored in `attemptsLeft`). After exhaustion, the OTP is locked and a new one must be requested.

### OTP Expiry

- OTP valid for **10 minutes** from generation time (`expiresAt = now + 10m`).
- Expired OTPs are rejected; user must request a new code.
- Periodic cleanup job (cron): delete `WhatsappOtp` rows where `expiresAt < now - 1 hour`.

### OTP Storage

- Store the OTP as a bcrypt hash (cost 10), same as passwords. Never store plain-text codes.
- The sent code is verified with `Bun.password.verify(inputCode, storedHash)`.

### Session Invalidation on Password Reset

- When a user resets their password (existing `POST /auth/reset-password`), any `WhatsappSession` rows for that user should also be deleted — add a Prisma `deleteMany` call in the reset handler.

### Transport

- All communication between the WhatsApp webhook and the Pass API uses HTTPS.
- The webhook endpoint must verify the WhatsApp/Twilio signature before processing any message.

---

## Sequence Diagrams (Text)

### Email/Password Login
```
User → Bot: "login"
Bot  → User: "Enter your email"
User → Bot: "student@example.com"
Bot  → [check DB: passwordHash non-null]
Bot  → User: "Enter your password"
User → Bot: "hunter2"
Bot  → [POST /auth/login]  → success
Bot  → User: "Welcome back, Alice! You're now signed in."
[WhatsappSession row created]
```

### Google-Only OTP Login
```
User → Bot: "login"
Bot  → User: "Enter your email"
User → Bot: "student@gmail.com"
Bot  → [check DB: passwordHash IS NULL → OTP path]
Bot  → [generate OTP, send email, store hash in WhatsappOtp]
Bot  → User: "We sent a 6-digit code to student@gmail.com"
User → Bot: "482931"
Bot  → [verify hash, check expiry + attempts]  → valid
Bot  → User: "Welcome back, Alice! You're now signed in."
[WhatsappOtp.used = true, WhatsappSession row created]
```

---

## Open Questions Before Implementation

1. **WhatsApp provider:** Twilio Programmable Messaging vs Meta Cloud API? Affects webhook verification and rate-limit headers.
2. **Phone number → user linkage:** Should users be able to link their WhatsApp number to their account from the web app? This would remove the email-prompt step on first message.
3. **Message language:** Support English only initially, or add Shona/Ndebele?
4. **OTP delivery:** The existing mailer (Resend) is assumed. Confirm the `whatsapp_otp` email template needs to be created.
