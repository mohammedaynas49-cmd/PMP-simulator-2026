# PMP Exam Simulator Security Specification

This document details the Zero-Trust security design for the PMP Exam Simulator's Firestore database, protecting both the Master Question bank and individual User Session profiles.

## Section 1: Data Invariants

### 1. Questions Collection (`/questions/{questionId}`)
- **Read Access:** Accessible to any authenticated user.
- **Write Access:** Server-only. Every real write (AI-generated or extracted from an uploaded book)
  happens through `server.ts` via the Firebase Admin SDK, which bypasses these rules entirely - the
  client SDK is denied `create`, `update`, and `delete` unconditionally, closing what used to be an
  unused (but exploitable) direct-write path for any signed-in client.

### 2. User Sessions Collection (`/sessions/{userId}`)
- **Owner Isolation (Read/Write):** A user can read, create, update, or delete their profile session only if `request.auth.uid == userId`.
- **Verified Status:** Standard users must be verified (`request.auth.token.email_verified == true`).
- **Data Integrity:** Any user session write must contain the correct schema properties (`totalAnswered`, `scorePercentage`, etc.) with correct type/min/max boundaries.

---

## Section 2: The "Dirty Dozen" Playloads (Vulnerability Attack Patterns)

These payloads represents unauthorized attempts by a malicious actor to poison or compromise the data.

1. **Unauthenticated Read of User Session:** Attacker attempts to list other candidate sessions.
2. **Identity Spoofing / Session Takeover:** User `A` tries to write to `/sessions/B`.
3. **Privilege Escalation (Role Injection):** Attacker tries to inject a `role: "admin"` in their user profile schema.
4. **Question Deletion Attack:** Malicious user tries to call `deleteDoc` on `/questions/q123`.
5. **Question Alteration Attack (Explanation Poisoning):** Malicious user tries to edit a question's correct answer or explanation.
6. **Denial of Wallet (ID Poisoning):** Injecting a 1MB junk ID string as `{questionId}` or `{userId}`.
7. **Score Value Poisoning:** Setting `scorePercentage` to `150` or a negative value like `-10`.
8. **Malicious Empty Write:** Slicing schemas by saving empty objects to bypass required data fields.
9. **Creation Timestamp Spoofing:** Submitting client-side datetime strings rather than `serverTimestamp()`.
10. **Session Bypass of Required Fields:** Forging a write without `incorrectIds` or `mastery` structures.
11. **Malicious Email Spoofing:** Creating a session with an unverified email claiming to belong to another user.
12. **Bypassing Query Safety:** Requesting listings on sessions without a filter matching the claimant's `uid`.

---

## Section 3: Test Runner

The Red Team validation suite is implemented in `firestore.rules.test.ts` (using
`@firebase/rules-unit-testing` against the Firestore emulator) and asserts that all 12 attacking
payloads above receive `PERMISSION_DENIED`, alongside control tests proving each legitimate
operation still succeeds.

Run it with:

```bash
npm run test:rules
```

This requires Java 21+ (the Firestore emulator's minimum supported runtime) and downloads the
emulator jar on first run. Writing this suite surfaced a real gap that has since been fixed:
`allow create` on `/sessions/{userId}` did not previously force `role == 'candidate'`, so a brand
new user could self-create their session document with `role: "admin"` on their very first write
(Dirty Dozen item #3, Privilege Escalation). Only `update` was protected against role changes;
`create` is now constrained the same way.
