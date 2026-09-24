// Full end-to-end check of the admin-only Book Companion / RAG feature (upload reference PDFs or
// text files, then get grounded MCQs and a RAG chat coach from them) against local emulators:
// guest login -> capture uid -> bootstrap admin via Firestore (simulating the one-time README
// console step) -> reload -> confirm the Study Books tab appears -> upload a text file -> list ->
// generate a grounded question -> chat with the RAG coach.
//
// How to run:
//   1. firebase emulators:start --only firestore,auth --project seismic-stream-gcf5x
//   2. In another terminal: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 DISABLE_HMR=true npm run dev
//      (with VITE_USE_FIREBASE_EMULATORS="true" in .env.local - see .env.example)
//   3. node book-feature-test.mjs
//
// DISABLE_HMR=true is required, not optional, for this script: Vite's dev server watches the
// entire project root by default and does a full client-side page reload on ANY file change under
// it - including this script's own temp upload file and the screenshots it writes into
// smoke-screens/. That silently wipes all React state (selectedMode, the uploaded book selection,
// etc.) mid-test. It's easy to miss with the offline fallback (question generation is instant, so
// the test finishes before a reload can land) but reliably breaks the run once a real
// GEMINI_API_KEY is configured and generation takes several real seconds.
//
// This is the only reliable way to verify this feature at all in an environment without real
// Google Cloud credentials: the real project also has Anonymous sign-in disabled (see README),
// and the Study Books tab isn't even visible in the UI without an admin account.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
import { chromium } from "playwright";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const adminApp = initializeApp({ projectId: firebaseConfig.projectId });
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const adminAuthSdk = getAuth(adminApp);

// Every server endpoint used below now requires a real Firebase ID token (see server.ts's
// requireAuth/requireAdmin) - this mints one for a given uid via a custom token exchange against
// the local Auth emulator, so this script's raw fetch() calls (outside the browser, which handles
// this itself through the app's own authFetch) can authenticate exactly like a real session would.
async function getBearerHeaderFor(uid) {
  const customToken = await adminAuthSdk.createCustomToken(uid);
  const resp = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    }
  );
  const data = await resp.json();
  return { Authorization: `Bearer ${data.idToken}` };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// Start from a clean slate so "the newest session" below is unambiguous.
const existing = await db.collection("sessions").get();
await Promise.all(existing.docs.map((d) => d.ref.delete()));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console:error]", msg.text());
});
page.on("response", (r) => {
  if (r.url().includes("/api/books")) console.log("[net]", r.status(), r.request().method(), r.url());
});

console.log("\n=== 1. Guest login (real anonymous auth via emulator) ===");
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#auth_portal", { timeout: 20000 });
await page.locator("#guest_signin_btn").click();
// Every brand-new account starts 'pending' (Candidate Directory approval model) - lands on the
// lockout screen first, not the sidebar. Bootstrapping straight to admin below (step 2) also
// normalizes accessStatus to 'granted' (see /api/admin/set-role), so this only matters here.
await page.waitForSelector("#access_locked_screen", { timeout: 15000 });
await page.waitForTimeout(1000);

// Find the freshly created session doc (should be exactly one, since this is a clean emulator run)
const snap = await db.collection("sessions").get();
assert(snap.size >= 1, `at least one session document exists (found ${snap.size})`);
const sessionDoc = snap.docs[snap.docs.length - 1];
const uid = sessionDoc.id;
console.log("Guest uid:", uid);

console.log("\n=== 2. Bootstrap this session to role: admin (simulates the README console step) ===");
await sessionDoc.ref.update({ role: "admin" });

console.log("\n=== 3. Reload so the app auto-syncs the Firestore role into a real admin custom claim ===");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#sidebar_main", { timeout: 15000 });
await page.waitForTimeout(1500); // let the auto-sync POST /api/admin/set-role + token refresh finish

const bookTabBtn = page.locator("#mode_book_btn");
const bookTabVisible = await bookTabBtn.count();
assert(bookTabVisible === 1, "Study Books tab is now visible after admin promotion");
await page.screenshot({ path: "smoke-screens/emu_admin_sidebar.png" });

console.log("\n=== 4. Open the Study Books tab and upload a plain-text study document ===");
await bookTabBtn.click();
await page.waitForSelector("#view_book_companion", { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "smoke-screens/emu_book_tab_empty.png" });

const testDoc = "test-study-material.txt";
fs.writeFileSync(
  testDoc,
  "Risk Register. A document in which the results of risk analysis and risk response planning are recorded.\n\n" +
  "Stakeholder Register. A project document including the identification, assessment, and classification of project stakeholders.\n\n" +
  "Change Control Board (CCB). A formally chartered group responsible for reviewing, evaluating, approving, delaying, or rejecting changes to the project."
);

// The Study Books tab has two different upload widgets depending on whether any books already
// exist: #book_file_input for the full empty-state dropzone, or an unlabeled (no id)
// "+ Add another book" tile once at least one book is present - scope by the view container so
// either one resolves uniquely regardless of which state we're in.
const fileInput = page.locator("#view_book_companion input[type=file]").first();
await fileInput.setInputFiles(testDoc);
await page.waitForSelector("text=/test-study-material|MyNotes|Uploaded/i", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.screenshot({ path: "smoke-screens/emu_book_uploaded.png", fullPage: true });

console.log("\n=== 5. Verify the book is listed via the API directly ===");
const listAuthHeader = await getBearerHeaderFor(uid);
const listResp = await page.evaluate(
  (headers) => fetch("/api/books/list", { headers }).then(r => r.json()),
  listAuthHeader
);
console.log("books/list response:", JSON.stringify(listResp));
assert(listResp.books && listResp.books.some(b => b.name === testDoc), "uploaded book appears in /api/books/list");

console.log("\n=== 6. Generate a grounded MCQ from the uploaded book ===");
const generateBtn = page.getByRole("button", { name: /Generate Custom PMP Question/i });
await generateBtn.waitFor({ state: "visible", timeout: 10000 });
await generateBtn.click();
try {
  // Generous timeout: a real GEMINI_API_KEY makes this a genuine double-pass round trip to the
  // live API (creator + reviewer), which can take well over 20s with a busy model or a retry.
  await page.locator("#option_A_btn").waitFor({ state: "visible", timeout: 45000 });
  await page.screenshot({ path: "smoke-screens/emu_book_grounded_question.png", fullPage: true });
  assert(true, "a grounded question rendered after clicking Generate");
} catch (e) {
  assert(false, "a grounded question rendered after clicking Generate (timed out)");
  fs.writeFileSync("smoke-screens/emu_book_grounded_question_FAILED.html", await page.content());
}

console.log("\n=== 7. Search for a PMP definition via the PMP Definitions Search view (available to every user, not just admins) ===");
await page.locator("#mode_definitions_btn").click();
await page.waitForSelector("#view_definitions_search", { timeout: 10000 });
await page.locator("#definition_search_input").fill("What is a Risk Register?");
await page.locator("#definition_search_btn").click();
try {
  // Generous timeout: with a real GEMINI_API_KEY, this is a live API round trip rather than the
  // near-instant offline keyword-match fallback.
  await page.waitForFunction(
    () => document.querySelector("#definition_result")?.textContent?.toLowerCase().includes("risk"),
    { timeout: 45000 }
  );
  assert(true, "Definitions Search answered referencing the uploaded material");
} catch (e) {
  assert(false, "Definitions Search answered referencing the uploaded material (timed out)");
}
await page.screenshot({ path: "smoke-screens/emu_definitions_search.png", fullPage: true });

console.log("\n=== 7b. Definition search spans ALL uploaded documents, not just the selected one ===");
// The currently selected book in the sidebar is testDoc (uploaded in step 4), which does NOT
// contain "kanban board" - that definition only exists in the separately-seeded PMBOK_glossary.pdf.
// If cross-document search works, the chat should still find and cite it.
const crossDocAuthHeader = await getBearerHeaderFor(uid);
const crossDocResp = await page.evaluate((authHeader) =>
  fetch("/api/books/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ message: "What is a kanban board?", language: "EN" })
  }).then(r => r.json()),
  crossDocAuthHeader
);
const crossDocSources = (crossDocResp.results || []).map(r => r.sourceBook);
console.log("Cross-document search sources:", crossDocSources);
assert(
  crossDocSources.includes("PMBOK_glossary.pdf"),
  "search found the answer in PMBOK_glossary.pdf even though it isn't the currently selected book"
);

console.log("\n=== 7c. Definitions Search: multi-result phrases, glossary+PMBOK8 combined, PMBOK7 excluded, conflict resolution, concise answers, honest 'not found', EN/FR harmony ===");
const regressionAuthHeader = await getBearerHeaderFor(uid);
async function uploadTextBook(filename, content) {
  const form = new FormData();
  form.append("file", new Blob([content], { type: "text/plain" }), filename);
  const res = await fetch("http://localhost:3000/api/books/upload", {
    method: "POST",
    headers: regressionAuthHeader,
    body: form
  });
  return res.json();
}
async function askDefinition(message, language = "EN") {
  const res = await fetch("http://localhost:3000/api/books/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...regressionAuthHeader },
    body: JSON.stringify({ message, language })
  });
  return res.json();
}

const pmbok8Upload = await uploadTextBook(
  "PMBOK_8_RegressionTest.txt",
  "Quantum Synergy Metric. A fictional metric used only for testing PMBOK 8 tier priority.\n\n" +
  "Analogous estimating. A fictional testing-only technique that uses historical data from a similar past activity to estimate the current one."
);
const pmbok7Upload = await uploadTextBook("PMBOK_7_RegressionTest.txt", "Quantum Synergy Metric. WRONG ANSWER FROM PMBOK 7 - MUST NEVER BE RETURNED.");
const conflictUpload = await uploadTextBook("PMBOK_8_ConflictRegressionTest.txt", "Kanban Board. WRONG PMBOK8 DEFINITION THAT MUST NOT WIN OVER THE GLOSSARY.");

// PMBOK 8 used when the glossary has no match at all; PMBOK 7 excluded entirely, even though it
// contains a (wrong) definition of the exact same term.
const tierResult = await askDefinition("What is a Quantum Synergy Metric?");
const tierSources = (tierResult.results || []).map(r => r.sourceBook);
console.log("Tier-priority sources:", tierSources);
assert(
  tierResult.found === true && tierSources.includes("PMBOK_8_RegressionTest.txt") && !tierSources.includes("PMBOK_7_RegressionTest.txt"),
  "PMBOK 8 tier supplies a match the glossary doesn't have, and PMBOK 7 is excluded entirely"
);
assert(!(tierResult.results || []).some(r => /wrong answer/i.test(r.definition)), "no result ever leaks the excluded PMBOK 7 content");

// The glossary's own definition wins over a conflicting PMBOK 8 definition of the identical term.
const glossaryPriorityResult = await askDefinition("What is a Kanban Board?");
const glossaryPrioritySources = (glossaryPriorityResult.results || []).map(r => r.sourceBook);
console.log("Glossary-priority sources:", glossaryPrioritySources);
assert(
  glossaryPriorityResult.found === true &&
  (glossaryPriorityResult.results || []).some(r => r.sourceBook === "PMBOK_glossary.pdf" && /kanban board/i.test(r.term)) &&
  !(glossaryPriorityResult.results || []).some(r => /wrong pmbok8/i.test(r.definition)),
  "the glossary's own Kanban Board entry wins and the conflicting PMBOK 8 definition never leaks in"
);

// A specific, unambiguous term still resolves to a concise definition (no elaboration sections).
const ccbResult = await askDefinition("What is a Change Control Board?");
const ccbEntry = (ccbResult.results || []).find(r => /change control board/i.test(r.term));
assert(ccbResult.found === true && !!ccbEntry, "a real, unambiguous term is found");
if (ccbEntry) {
  assert(ccbEntry.definition.length < 400, `definition stays concise, no elaboration sections (got ${ccbEntry.definition.length} chars)`);
  assert(!/purpose and function|key components|relationship to other concepts/i.test(ccbEntry.definition), "definition has no elaboration section headers");
}

// A genuinely nonexistent term returns a plain, honest not-found result - no fabricated answer.
const notFoundResult = await askDefinition("What is a Xylophone Blockchain Protocol?");
assert(
  notFoundResult.found === false && (notFoundResult.results || []).length === 0,
  "a genuinely nonexistent term returns found:false with zero results, no fabricated fallback answer"
);

// Financial/EVM terms get their standard calculation formula attached, unaffected/unaltered by
// the French translation pass applied to the term/definition text alongside it.
const evmResult = await askDefinition("earned value");
const evEntry = (evmResult.results || []).find(r => /earned value/i.test(r.term));
assert(!!evEntry && evEntry.formula === "EV = % Complete × BAC", `Earned Value gets its calculation formula attached (got: ${evEntry?.formula})`);
const evmResultFr = await askDefinition("valeur acquise", "FR");
const evEntryFr = (evmResultFr.results || []).find(r => r.formula === "EV = % Complete × BAC");
assert(!!evEntryFr, "the formula survives the French translation pass unchanged, even though the term/definition around it get translated");

// A broad multi-word phrase surfaces EVERY distinct matching definition (glossary entries plus a
// PMBOK 8 technique the glossary doesn't have), not just one blended answer.
const multiResult = await askDefinition("estimating");
const multiTerms = (multiResult.results || []).map(r => r.term.toLowerCase());
console.log("Multi-result 'estimating' terms:", multiTerms);
assert(
  multiResult.found === true && multiTerms.length >= 2 &&
  multiTerms.some(t => t.includes("estimat")) &&
  (multiResult.results || []).some(r => r.sourceBook === "PMBOK_8_RegressionTest.txt" && /analogous estimating/i.test(r.term)),
  "a broad keyword returns multiple distinct definitions, combining glossary entries with a PMBOK 8 technique the glossary alone doesn't have"
);

// Harmonized EN/FR: the uploaded materials are in English, so a French query must still find and
// translate the same result the English query does.
const frenchResult = await askDefinition("Qu'est-ce qu'un tableau Kanban ?", "FR");
assert(
  frenchResult.found === true &&
  (frenchResult.results || []).some(r => r.sourceBook === "PMBOK_glossary.pdf" && /[ée]/i.test(r.definition)),
  "a French query against English-only source documents still finds a match and translates it"
);

// Clean up the throwaway regression-test books so they don't accumulate across runs.
for (const upload of [pmbok8Upload, pmbok7Upload, conflictUpload]) {
  if (upload.book?.id) {
    await fetch(`http://localhost:3000/api/books/delete/${upload.book.id}`, {
      method: "DELETE",
      headers: regressionAuthHeader
    });
  }
}

console.log("\n=== 8. Open the Extracted Questions tab (document-extraction feature) ===");
await page.locator("#mode_book_btn").click();
await page.waitForSelector("#view_book_companion", { timeout: 10000 });
await page.getByRole("button", { name: /Extracted Questions/i }).click();
await page.waitForTimeout(1500); // let the background scan's status settle (no Gemini key locally -> skipped_offline)
await page.screenshot({ path: "smoke-screens/emu_book_extracted_tab.png", fullPage: true });
const extractedTabText = await page.locator("#view_book_companion").textContent();
assert(
  /extraction unavailable|no questions found|scanning your document/i.test(extractedTabText || ""),
  "Extracted Questions tab renders a recognizable state (unavailable/empty/scanning)"
);

console.log("\n=== 9. Seed extracted questions directly (bypassing Gemini, unavailable here) and run a full timed exam ===");
// Simulates what extractQuestionsFromBook would have written had a Gemini key been configured -
// this is the only way to exercise the exam UI/scoring logic in an environment without one.
const examBookDoc = (await db.collection("books").where("name", "==", testDoc).limit(1).get()).docs[0];
const examBookId = examBookDoc.id;
const seedQuestions = [
  { scenario: "Which technique is used for qualitative risk analysis?", options: ["A. Monte Carlo simulation", "B. Probability and impact matrix", "C. Critical path method", "D. Earned value management"], correct_option: "B" },
  { scenario: "What does CPI stand for in Earned Value Management?", options: ["A. Cost Performance Index", "B. Critical Path Indicator", "C. Change Process Initiation", "D. Contract Pricing Index"], correct_option: "A" },
  { scenario: "Who is responsible for the product backlog in Scrum?", options: ["A. Scrum Master", "B. Development Team", "C. Product Owner", "D. Project Sponsor"], correct_option: "C" }
];
await Promise.all(seedQuestions.map((q, i) => {
  const qId = `extracted_${examBookId}_${i}`;
  return db.collection("questions").doc(qId).set({
    question_id: qId,
    eco_domain: "Process",
    scenario: q.scenario,
    options: q.options,
    correct_option: q.correct_option,
    explanation: `Test explanation for: ${q.scenario}`,
    pmbok_8_reference: "Extracted from: test-study-material.txt",
    methodology: "Predictive",
    tags: ["Test"],
    source_book_id: examBookId,
    grounded_book_name: testDoc
  });
}));
await examBookDoc.ref.update({ extractionStatus: "done", extractedQuestionsCount: seedQuestions.length });

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#sidebar_main", { timeout: 15000 });
await page.locator("#mode_book_btn").click();
await page.waitForSelector("#view_book_companion", { timeout: 10000 });
await page.getByText(testDoc, { exact: false }).first().click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Extracted Questions/i }).click();
await page.waitForTimeout(1000);

const startExamBtn = page.locator("#start_extracted_exam_btn");
await startExamBtn.waitFor({ state: "visible", timeout: 10000 });
assert(true, "Start Timed Exam button appears once the book has extracted questions");
await startExamBtn.click();
await page.waitForSelector("#extracted_exam_timer", { timeout: 10000 });
assert(true, "Exam timer appears after starting the timed exam");

for (let i = 0; i < seedQuestions.length; i++) {
  const text = await page.locator("#view_book_companion").textContent();
  const match = seedQuestions.find(q => text.includes(q.scenario));
  assert(!!match, `Exam question ${i + 1} matches one of the seeded extracted questions`);
  await page.locator(`#option_${match.correct_option}_btn`).click();
  await page.locator("#submit_answer_btn").click();
  await page.waitForTimeout(300);
  const coachingTrayDuringExam = await page.locator("#coaching_tray").count();
  assert(coachingTrayDuringExam === 0, `Feedback stays locked during the live timed exam (question ${i + 1})`);
  if (i < seedQuestions.length - 1) {
    await page.locator("#next_question_btn").click();
    await page.waitForTimeout(300);
  }
}

await page.locator("#submit_extracted_exam_btn").click();
await page.waitForSelector("#extracted_exam_score", { timeout: 10000 });
const examScoreText = (await page.locator("#extracted_exam_score").textContent()).trim();
console.log("Extracted-exam score shown:", examScoreText);
assert(examScoreText === "100%", `Score is 100% after answering every seeded question correctly (got ${examScoreText})`);
await page.screenshot({ path: "smoke-screens/emu_extracted_exam_results.png", fullPage: true });

const reviewCoachingTray = await page.locator("#coaching_tray").count();
assert(reviewCoachingTray >= 1, "Coaching tray/explanations become visible once in post-exam review mode");

await page.locator("#exit_extracted_exam_btn").click();
await page.waitForTimeout(500);
assert(await page.locator("#start_extracted_exam_btn").count() === 1, "Exiting review returns to the normal Extracted Questions tab");

console.log("\n=== 10. A plain non-admin candidate can see and use PMP Definitions Search ===");
// Fresh page + fresh anonymous session, deliberately never promoted to admin - this is the whole
// point of moving definitions search out of the admin-only Study Books tab.
const nonAdminPage = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await nonAdminPage.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await nonAdminPage.waitForSelector("#auth_portal", { timeout: 20000 });
await nonAdminPage.locator("#guest_signin_btn").click();
// Starts 'pending' like any new account - approve it directly (not testing the approval flow
// itself here, that's admin-panel-test.mjs step 6) so this can get on with testing what a
// candidate actually sees once they're let in.
await nonAdminPage.waitForSelector("#access_locked_screen", { timeout: 15000 });
const pendingSessions = await db.collection("sessions").get();
const newest = pendingSessions.docs.filter(d => d.data().accessStatus === "pending").pop();
if (newest) await newest.ref.update({ accessStatus: "granted" });
await nonAdminPage.reload({ waitUntil: "domcontentloaded" });
await nonAdminPage.waitForSelector("#sidebar_main", { timeout: 15000 });
assert(await nonAdminPage.locator("#mode_definitions_btn").count() === 1, "PMP Definitions button is visible for a plain non-admin candidate");
assert(await nonAdminPage.locator("#mode_book_btn").count() === 0, "PMP Study Books button stays hidden for a non-admin candidate");
assert(await nonAdminPage.locator("#mode_admin_btn").count() === 0, "Admin Control Panel button stays hidden for a non-admin candidate");
await nonAdminPage.locator("#mode_definitions_btn").click();
await nonAdminPage.waitForSelector("#view_definitions_search", { timeout: 10000 });
await nonAdminPage.locator("#definition_search_input").fill("What is a kanban board?");
await nonAdminPage.locator("#definition_search_btn").click();
try {
  await nonAdminPage.waitForFunction(
    () => document.querySelector("#definition_result")?.textContent?.toLowerCase().includes("kanban"),
    { timeout: 45000 }
  );
  assert(true, "non-admin candidate can search and get a definition back");
} catch (e) {
  assert(false, "non-admin candidate can search and get a definition back (timed out)");
}
await nonAdminPage.close();

fs.unlinkSync(testDoc);
await browser.close();
console.log(process.exitCode === 1 ? "\nSome checks FAILED." : "\nAll checks passed.");
