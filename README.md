<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b36b1d86-893f-45bf-afd4-71545e11ca07

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Promoting the first admin

There is no admin email hardcoded anywhere in the app or in `firestore.rules`. Admin status is
authoritatively an `admin: true` custom claim on the candidate's Firebase Auth account (checked
by `isAdmin()` in `firestore.rules`), minted only by `POST /api/admin/set-role` in `server.ts`
via the Firebase Admin SDK. The `role` field on a candidate's `/sessions/{uid}` document is kept
as a fallback/display mirror only. To bootstrap your very first admin account:

1. Sign in to the app once with that account, so its session document is created.
2. Open the Firebase Console -> Firestore Database -> `sessions/{your uid}`.
3. Manually set the `role` field to `"admin"` and save.
4. Reload the app signed in as that account: it automatically calls `/api/admin/set-role` on
   itself once (see the session-loading effect in `Dashboard.tsx`) to mint the real custom claim
   from that Firestore fallback, then refreshes its ID token.

Step 2 is a one-time, out-of-band step (the console writes as a privileged Google Cloud principal
and isn't subject to Firestore Security Rules). Every subsequent admin is promoted from inside
the app's own Admin Control Panel, which calls the same endpoint. This whole flow (steps 3-4, plus
promoting/demoting other candidates) is exercised end-to-end against the Auth + Firestore
emulators by `test-admin-endpoint.mjs` - see that file's header for how to run it.

## API security model

`firestore.rules` only ever governed direct client-SDK access to Firestore - it never covered the
Express API in `server.ts` itself, which had no server-side authentication at all until this was
added. In practice that meant every endpoint (including the ones that cost real money via Gemini,
or that upload/delete study material) could be called directly, by anyone, with no Firebase account
and no rate limit. This is now closed:

- **`requireAuth`**: every endpoint that costs a Gemini call or reads uploaded material
  (`/api/books/list`, `/api/books/:id/extracted-questions`, `/api/books/generate-question`,
  `/api/books/chat`, `/api/matching-exercise`, `/api/questions/generate`) requires a valid Firebase
  ID token (`Authorization: Bearer <token>`) - a real signed-in candidate, including an anonymous
  guest session, not just anyone with network access. The client attaches this automatically via
  `src/lib/apiClient.ts`'s `authFetch()`.
- **`requireAdmin`**: `/api/books/upload`, `/api/books/delete/:id`, and `/api/admin/set-role` also
  require the caller to be an admin (custom claim first, Firestore `role` fallback for a
  freshly-bootstrapped admin - same check `firestore.rules`' `isAdmin()` does), matching the
  UI's existing admin-only gating with a real server-side check behind it.
- **Rate limiting**: the same Gemini-backed endpoints, plus upload, are capped at 40 requests per
  15 minutes per IP (`express-rate-limit`) - generous for real practice use, tight enough to blunt a
  scripted loop burning through the shared quota/budget.
- **Upload file type allowlist**: `/api/books/upload` now only accepts `.pdf`/`.txt` (the only two
  formats the parser actually understands); anything else is rejected before it's ever read.
- **Security headers**: `helmet()` is applied globally (CSP left off deliberately - see the comment
  in `server.ts` - since this app serves Vite's dev/build output directly and a default CSP would
  break it outright rather than add protection without a proper per-asset policy).
- **Firestore rules tightened**: `books`/`chunks`/`glossaryTerms` writes are now admin-only (used to
  be open to any signed-in user, including guests, even though the server's own Admin-SDK writes
  never needed that permission); `questions` client writes are closed entirely (see
  `security_spec.md`).
- **Local emulator project id**: `.firebaserc` now pins the default project to
  `seismic-stream-gcf5x` - without it, `firebase emulators:start` silently defaults the Auth
  emulator to a placeholder `demo-*` project, which mints tokens the Admin SDK then rejects
  (`aud` mismatch) once server-side token verification actually checks it, exactly the kind of thing
  the README's `--project seismic-stream-gcf5x` flag already worked around explicitly - this makes
  it work even if that flag is forgotten.

**Not done here - requires action outside this codebase, before real users are onboarded:**
- Enable [Firebase App Check](https://firebase.google.com/docs/app-check) for bot/abuse protection
  beyond what a bearer token alone provides.
- Restrict the Gemini API key and the Firebase Web API key in Google Cloud Console (HTTP referrer /
  API restrictions), and set up billing/quota alerts.
- Cap Cloud Run min/max instances and concurrency to bound worst-case cost exposure.
- `npm audit` still reports a handful of moderate-severity issues confined to `firebase-tools`'
  own dependency tree (a local dev/emulator tool, not part of the deployed app) - fixing those
  requires a breaking downgrade of `firebase-tools` and wasn't worth it; the critical- and
  high-severity issues found (in `vite` and `websocket-driver`) were fixed via `npm audit fix`.

## Testing the Firestore security rules

`firestore.rules.test.ts` runs the "Dirty Dozen" Red Team suite described in
[security_spec.md](security_spec.md) against the Firestore emulator:

```bash
npm run test:rules
```

Requires Java 21+ (the Firestore emulator's minimum supported runtime).

## Testing against local emulators (admin-only features, Google/Guest sign-in)

Some things can't be tested against the real project without real Google Cloud credentials or
without a real Google account (server-side book upload/RAG, `/api/admin/set-role`, and - on this
project specifically - Guest sign-in, since Anonymous auth happens to be disabled in this
project's Firebase Console). Running against local emulators sidesteps all of that:

```bash
# Terminal 1
firebase emulators:start --only firestore,auth --project seismic-stream-gcf5x

# Terminal 2
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 DISABLE_HMR=true npm run dev
```

`DISABLE_HMR=true` matters whenever you're also driving the app with Playwright (see the two test
scripts below): Vite's dev server otherwise watches the entire project root and triggers a full
client-side page reload on ANY file change under it - including a test script's own temp uploads or
screenshots - which silently resets all React state mid-run. Harmless with the offline
question-generation fallback (instant), but it will intermittently break automated tests once a
real `GEMINI_API_KEY` is configured, since generation then takes long enough for a stray reload to
land mid-test.

Then set `VITE_USE_FIREBASE_EMULATORS="true"` in `.env.local` before starting terminal 2, so the
frontend also talks to the emulators (see `.env.example`). Requires Java 21+.

With this running: "Enter as Guest Simulator" works normally (the emulator enables every sign-in
method regardless of the real project's settings), and you can bootstrap an admin account by
writing `role: "admin"` directly to that guest's `/sessions/{uid}` document with a small
Admin-SDK script pointed at the same emulators (see the pattern in `test-admin-endpoint.mjs`) -
no real Firebase console needed. Once admin, the Study Books tab becomes visible and file
uploads, listing, grounded question generation, and the RAG chat all persist to the emulator only,
never the real project. `book-feature-test.mjs` automates this whole flow end-to-end (guest login,
admin bootstrap, upload, list, grounded MCQ, RAG chat) - see its header for how to run it.
`admin-panel-test.mjs` covers the rest of the Admin Control Panel the same way (Candidate Tracker
access/role toggles, Simulator Rules quota persistence).

## PMP Definitions Search (available to every candidate)

Any signed-in candidate - not just admins - can look up a PMP term or concept from the sidebar's
**PMP Definitions** entry. It's a dictionary-style search (type a term or keyword, get back every
matching definition as its own card), not a chat. This used to live as a "Study Coach Chat" tab
inside the admin-only Study Books view; it was pulled out into its own always-visible mode
(`DefinitionsSearchView.tsx`) so that reviewing definitions - not just running practice exercises -
is available to candidates too.

Under the hood, `POST /api/books/chat` searches **every uploaded document at once** and can return
**multiple distinct definitions in one response** - a broad query like "estimating" returns every
matching glossary entry (`estimate`, `estimate at completion (EAC)`, ...) *and* any specific
technique the PMBOK 8 guide defines that the glossary doesn't (`analogous estimating`,
`parametric estimating`, `three-point estimating`, ...), each as its own `{term, definition,
sourceBook}` result rather than one blended paragraph. A query is matched against a **stem** of
each significant word (roughly its first 6 characters), not an exact substring, since "estimation"
otherwise never literally contains "estimate" or vice versa despite being the same PMP concept -
this also means results can be broader than a single exact term when the query's words happen to
overlap with several distinct glossary entries (e.g. searching a multi-word phrase can surface
tangentially-related entries that share just one of its words - by design, since a wider net is the
whole point of "give every definition containing the phrase's keywords").

**Source priority:** the glossary (any book name containing "glossary") is checked first and is
authoritative - it always wins a same-term conflict, deterministically, not just by prompt
instruction. The PMBOK 8 guide (name containing "pmbok" and a standalone "8") and, once one is
uploaded, an **Agile Practice Guide** (name containing "agile") are then consulted **in addition**,
to supply techniques/terms the glossary doesn't have, not merely as a fallback when the glossary is
completely empty - each narrowed to its most relevant chunks first (via the same stem-based keyword
scoring, factored into a shared `extractSupplementalDefinitions` helper) before asking the model to
extract distinct term/definition pairs from just those chunks, explicitly told to skip anything an
earlier tier already covers. **PMBOK 7th-edition material is excluded entirely** (name containing
"pmbok" and a standalone "7" never enters the search at all) - this classification is filename-based,
so an unusually-named file could be missed by the heuristic. The Agile tier simply contributes
nothing until a matching book is uploaded; no other change is needed to start using one.

**Calculation formulas for financial/EVM terms:** results for Earned Value, Planned Value, Actual
Cost, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI, and EMV get their standard PMP formula (e.g.
`CPI = EV ÷ AC`) attached as a separate `formula` field, shown as its own line under the definition.
This is a small hardcoded lookup table (`FINANCIAL_FORMULAS` in `server.ts`), not something asked
of Gemini - a model "recalling" a formula risks subtly transposing it (e.g. EV/AC vs AC/EV) and
presenting the wrong one as authoritative. The formula is matched on the term's English name before
any French translation and passed through unchanged afterward, since PMP formulas are conventionally
written with their English acronyms (EV, AC, CPI, ...) even in French-language materials.

**EN/FR harmonized:** the uploaded materials are in English, so literal keyword matching against a
French query would never work (the French words simply don't appear in the English source text). A
French query is translated to English first (one quick Gemini call), matched/extracted the same way
as an English query, then every result's term and definition are translated back to French in one
batched call at the end - so search quality doesn't depend on which language you type in.

**Answers are definitions, not explanations:** each result is only the definition itself (1-3
sentences, grounded in whichever source matched), no examples, no "purpose and function" sections,
no related-concepts padding. If nothing matches anywhere, the response says so plainly
("No definition found." / "Aucune définition trouvée.") with zero results - resolved deterministically
*before* ever calling Gemini for extraction, not left to prompt compliance, so there's no fallback
to the model's general PMP knowledge and no risk of a hallucinated definition for a term that isn't
actually in any uploaded document.

`book-feature-test.mjs` step 7b locks in the cross-document behavior; step 7c locks in tier
priority + PMBOK 7 exclusion, glossary-wins-conflict (with a deterministic dedup filter as a
safety net beyond just the prompt instruction), answer conciseness, the honest not-found path, the
multi-result phrase behavior (glossary + PMBOK 8 combined), and the EN/FR harmonization (uploads
throwaway PMBOK-8/PMBOK-7/conflicting-glossary test books, asserts the right ones win and the wrong
ones never leak into any result, then deletes them); step 10 locks in that a plain non-admin
candidate can see and use the feature at all, while the admin-only Study Books/Admin Control Panel
entries stay hidden for them.

The admin-only **PMP Study Books** tab still handles book upload/management, grounded MCQ
generation per book, and the document-extraction timed exam (see below) - only the
definition-lookup piece moved to be universally available.

## Terminology Matching exercise (available to every candidate)

Alongside the single-question practice/exam modes, the sidebar's **Terminology Matching** entry
(`MatchingExerciseView.tsx`, not admin-gated) offers a different exercise format: match 4-5 terms
to their correct definitions in one screen, drawn at random from the uploaded **glossary only**
(any book name containing "glossary" - the same tier used as the authoritative source in
Definitions Search). It's glossary-only on purpose: PMBOK/Agile chunks aren't reliably
one-term-per-line the way the glossary is, so sampling from them risks producing a pair whose
"definition" is really just an arbitrary paragraph fragment rather than an actual, checkable
definition.

`GET /api/matching-exercise?language=EN|FR` reuses the same deterministic `parseGlossaryEntries()`
parser as Definitions Search, collects every `{term, definition}` pair across all glossary books,
shuffles with a Fisher-Yates pass, and samples 4 or 5 of them. Terms stay in their original
(already-shuffled) order on the left; definitions get shuffled again independently and lettered
A-E on the right, so the letter order never gives away the term order. For French, the sampled
pairs are translated in one batched Gemini call (`temperature: 0`, schema-constrained JSON) after
sampling - if that call fails, the English pairs are returned rather than blocking the exercise.

The candidate assigns a letter to each term via a dropdown, then clicks **Check Answers**, which
reveals a green/red mark per row and an overall `Score: N / M correct` banner - checking is a
pure client-side comparison against the pairs already in state, no extra request. **New Exercise**
re-fetches a fresh random sample and clears the score.

`ui-smoke-test.mjs` step 10 exercises this end-to-end in a real browser: opens the mode, reads the
API's known-correct `{term, definition}` pairs, maps each definition's text back to its on-screen
letter (since definitions are shuffled client-side, the letter order can't be assumed), selects
every term's correct letter, checks answers, and asserts a perfect score is shown; it then starts a
new exercise and asserts the score clears. Note: `React.StrictMode` (`src/main.tsx`, dev builds
only) double-invokes the mount effect, so two random samples get fetched on load and the UI ends up
showing whichever one resolves last - the test tracks the *latest* `/api/matching-exercise`
response rather than the first one for exactly this reason. This is a dev-only double-fetch, not a
user-facing bug: StrictMode's double-invoke doesn't happen in production builds.

The French-language translation path is implemented the same way as Definitions Search's own
translation call, but hasn't been exercised against a live Gemini response in this session - the
account's free-tier quota was exhausted uploading a large Agile Practice Guide PDF earlier and the
English-only path was prioritized while waiting for the daily reset.

## Document question extraction & book-based timed exam

Uploading a study book doesn't just enable AI-generated grounded MCQs and RAG chat - it also
triggers a background scan (`extractQuestionsFromBook` in `server.ts`) that looks for multiple-choice
questions **already present verbatim in the document itself** (as opposed to new AI-drafted ones),
via a Gemini prompt with a structured schema. This runs automatically right after upload; if no
`GEMINI_API_KEY` is configured, the scan is skipped immediately (`extractionStatus: "skipped_offline"`)
rather than staying "pending" forever.

Results land in the Study Books tab's third sub-tab, **Extracted Questions**, alongside the
existing MCQ Generator and Study Coach Chat tabs:
- Practice them one by one (same `QuestionCard` used everywhere else, full feedback/explanation).
- Or click **Start Timed Exam** to take every extracted question from that book as a real, timed,
  locked-feedback mock exam (90 seconds/question) - correctness and explanations stay hidden until
  you submit or the clock runs out, exactly like the main 180-question mock exam. Afterward you get
  a score and a full review pass with every explanation revealed. This exam attempt is a book-scoped
  self-check only - it isn't written to the candidate's official Firestore session/mastery stats.

Deleting a book also deletes every question extracted from it (`questions` docs with a matching
`source_book_id`).

Since this environment has no `GEMINI_API_KEY`, `book-feature-test.mjs` (step 9) verifies the whole
extracted-questions + timed-exam flow by seeding fake extracted questions directly via the Admin
SDK (simulating what the Gemini scan would have written) rather than exercising the real prompt -
see that script for the exact scoring/locked-feedback assertions.

## UI smoke test

`ui-smoke-test.mjs` drives the app in a real (headless) browser via Playwright: guest login,
domain practice, the full mock exam, the exam feedback lockdown, the post-exam review screen, and
(step 10) the Terminology Matching exercise (answer every pair correctly, check the perfect score,
start a new exercise, confirm the score clears). It's a useful regression check any time - and
specifically recommended before/after the planned `Dashboard.tsx` refactor, to catch anything a
code-only review would miss.

```bash
npm run dev                                                    # in one terminal
npx playwright install chromium chromium-headless-shell        # first time only
node ui-smoke-test.mjs                                         # in another terminal
```

Screenshots are written to `smoke-screens/` (gitignored) for manual inspection.

**Known local-only limitations** (not app bugs - real Google Cloud credentials fix all of these
in production on Cloud Run): without `gcloud auth application-default login` or a service account,
server-side Firestore Admin SDK calls (book upload/list, `/api/admin/set-role`) return errors
instead of crashing the server. Separately, this Firebase project currently has **Anonymous
sign-in disabled** in the Firebase Console (Authentication -> Sign-in method), so "Enter as Guest
Simulator" always falls back to the local, non-persisted guest mode, in every environment,
including production - enable that provider if session tracking for guests matters.
