# Manual / end-to-end test checklist

These can't be meaningfully unit-tested (LLM output, real PDFs, WhatsApp, mobile,
live rate limiting, cross-service flows). Run them against your local stack with
web + server + mobile up and migrations applied. See `TESTING.md` for the
automated suite that already covers the pure logic.

Setup once:
```bash
export API="http://localhost:3000"   # your server URL
export TOKEN=$(curl -s $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"you@test.com","password":"yourpass"}' | jq -r .accessToken)
```

---

## A. Project generation — speed, coherence, progress, cancel  *(PR #12, #15)*
- [ ] **Web /projects/new** → fill grade+subject → **Continue**. A fresh project finishes in **~30–45s** (not ~5 min).
- [ ] During generation you see a **progress bar + "Writing section N of 6"** (not a static spinner).
- [ ] **Cancel generation** mid-run returns to the form with inputs intact.
- [ ] Open the finished project and **read it end-to-end**: title, place, named people, chosen solution and the data tables are **mutually consistent** across stages (this is the spine's job — only a human can judge it).
- [ ] Word count meets the grade minimum (3000 / 4500 / 7000).
- [ ] CLI stream sanity: `curl -N $API/projects/generate -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"grade":"Form 4","subject":"Biology"}'` → `connected → project_id → chunk… → done`.

## B. Reuse pool + rotation + identity swap  *(PR #12)*
Temporarily set `POOL_SIZE = 2` in `apps/server/src/mastra/project/pool.ts`, restart, then:
- [ ] Generate **3** projects for the same grade+subject. DB shows **2** `ProjectTemplate` rows; the 3rd was served from the pool (`ProjectPoolCursor.nextIndex` advanced, no 3rd template).
  ```bash
  psql "$DATABASE_URL" -c 'SELECT slot, topic FROM "ProjectTemplate" ORDER BY slot;'
  psql "$DATABASE_URL" -c 'SELECT * FROM "ProjectPoolCursor";'
  ```
- [ ] **Identity swap:** generate the pooled one as a *different* user → their **PDF cover shows their own** name/centre/candidate, but the body is identical to the original and contains **no trace** of the first student.
- [ ] Reuse path returns in **~2–5s** (no model latency).
- [ ] Revert `POOL_SIZE` to `100`.

## C. Document cover page  *(PR #12)*
Open a project's PDF / HTML / DOCX:
```bash
curl -s "$API/projects/<ID>/pdf?token=$TOKEN" -o /tmp/p.pdf && open /tmp/p.pdf
open "$API/projects/<ID>/html?token=$TOKEN"
curl -s "$API/projects/<ID>/docx" -H "Authorization: Bearer $TOKEN" -o /tmp/p.docx && open /tmp/p.docx
```
- [ ] Page 1 = ZIMSEC header + candidate info table, **no long project title**.
- [ ] The title appears as the **H1 on page 2** and in the running header.

## D. Paynow webhook security  *(PR #13)* — *logic is unit-tested; verify live wiring*
- [ ] Forged webhook rejected: `curl -s -o /dev/null -w "%{http_code}\n" $API/payments/webhook -d 'reference=x&status=Paid&hash=NOPE'` → **403**.
- [ ] A real signed callback (or a real sandbox payment) upgrades the user and sends **one** confirmation email; posting the same callback again does **not** re-date the expiry or re-send the email.

## E. Rate limiting (live)  *(PR #13)*
- [ ] `for i in $(seq 1 45); do curl -s -o /dev/null -w "%{http_code} " $API/auth/login -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"bad"}'; done; echo` → 401s then **429** past 40 in the window.

## F. Subscription-expiry enforcement (live)  *(PR #13)*
- [ ] Set a user `plan=PASS` but `Subscription.expiryDate` in the past, then exceed the **FREE** paper/project limit → blocked at FREE limits (effective plan downgrade).
  ```bash
  psql "$DATABASE_URL" -c "UPDATE \"Subscription\" SET \"expiryDate\"=now()-interval '1 day' WHERE \"userId\"='<ID>';"
  ```

## G. Atomic quota under concurrency  *(PR #14)* — *also covered by the DB integration test*
- [ ] Drive a user to their limit, then fire concurrent requests; the number of **200s never exceeds the remaining quota**, the rest are **402**, and `bonusProjects` isn't double-decremented:
  ```bash
  seq 10 | xargs -P10 -I{} curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/projects/generate \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"grade":"Form 4","subject":"Biology"}' | sort | uniq -c
  ```

## H. Tokens + refresh rotation  *(PR #14)*
- [ ] Decode an access token's `exp` — it should be **~1h** (not 30 days).
- [ ] Reuse one refresh token in two concurrent `/auth/refresh` calls → **one 200, one 401**; the old token no longer works afterwards.
- [ ] In web + mobile, keep using the app past an hour → it silently refreshes on 401, **no forced logout**.

## I. WhatsApp project brief confirmation  *(PR #15)*
On a linked number, send **"project"** and complete the brief:
- [ ] After the last field you get a **review card** + a prompt to reply **GENERATE / EDIT / CANCEL** (it does **not** auto-start).
- [ ] **EDIT** restarts the brief, **CANCEL** returns to the menu, **GENERATE** starts it.
- [ ] Mid-gate, "study a paper" still switches features (interruptible).

## J. Actionable quota error  *(PR #15)*
- [ ] Hit a limit and confirm the 402 body includes **`resetsOn`**:
  `curl -s -X POST $API/papers/<PAPER_ID>/sessions -H "Authorization: Bearer $TOKEN" | jq`

## K. Explanation cache  *(PR #16)*
- [ ] Submit a wrong answer → **Explain** (streams from the model). Click **Explain again** on the same question → returns **instantly**, and server logs show **no new explain-agent call**.

## L. R2 avatar cleanup  *(PR #16)*
- [ ] Change the avatar twice (two different R2 URLs) → the **previous R2 object is deleted** from the bucket; an external (Google) avatar URL is left untouched.

## M. Mobile (Expo) smoke  *(general)*
- [ ] Login + Google sign-in, dashboard stats load, start a paper session, generate a project, push-notification permission prompt, offline banner behaviour.

---

### Quick smoke order if short on time
A (web gen + progress/cancel) → C (cover) → D (forged webhook 403) → E (rate limit 429) → G (concurrent quota) → I (WhatsApp confirm) → K (explanation cache).
