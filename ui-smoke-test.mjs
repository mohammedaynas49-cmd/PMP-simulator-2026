// Playwright UI smoke test: exercises the guest login -> domain practice -> full mock exam ->
// exam lockdown -> review flow end-to-end in a real headless browser, against a locally running
// dev server. Useful on its own, and specifically intended as a regression safety net for the
// planned Dashboard.tsx refactor (see memory/pmp-exam-simulator-state.md) - rerun this before and
// after that refactor and diff the screenshots/console output.
//
// How to run:
//   1. DISABLE_HMR=true npm run dev            (in one terminal)
//   2. npx playwright install chromium chromium-headless-shell   (first time only)
//   3. node ui-smoke-test.mjs
//
// DISABLE_HMR=true matters here: Vite's dev server watches the whole project root and does a full
// client-side reload on ANY file change under it, including this script's own screenshots written
// into smoke-screens/ mid-run - which silently wipes all React state. Cheap to miss with the
// offline question-generation fallback (near-instant), but reliably breaks this test once a real
// GEMINI_API_KEY is configured, since generation then takes long enough for a reload to land
// mid-test.
//
// Screenshots land in smoke-screens/ (gitignored - inspect locally, not meant to be committed).
import { chromium } from "playwright";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const adminApp = initializeApp({ projectId: firebaseConfig.projectId });
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const OUT_DIR = "smoke-screens";
fs.mkdirSync(OUT_DIR, { recursive: true });

const consoleErrors = [];
const consoleWarnings = [];

function logStep(msg) {
  console.log(`\n=== ${msg} ===`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
    if (msg.type() === "warning") consoleWarnings.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      consoleErrors.push(`HTTP ${resp.status()} <- ${resp.request().method()} ${resp.url()}`);
    }
  });

  logStep("1. Load auth screen");
  // Vite's dev server keeps a persistent HMR WebSocket open, so "networkidle" never fires here.
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#auth_portal", { timeout: 20000 });
  await page.screenshot({ path: `${OUT_DIR}/01_auth_screen.png` });
  const title = await page.title();
  console.log("Page title:", title);

  logStep("2. Enter as Guest Simulator");
  const guestBtn = page.locator("#guest_signin_btn");
  await guestBtn.waitFor({ state: "visible", timeout: 10000 });
  await guestBtn.click();
  // Every brand-new account starts 'pending' (see the Candidate Directory approval model) and is
  // locked out of the whole app until an admin approves it - that flow itself is covered by
  // admin-panel-test.mjs step 6. This suite is about the rest of the candidate experience, so
  // approve the fresh session directly via the Admin SDK rather than re-testing approval here.
  await page.waitForSelector("#access_locked_screen", { timeout: 15000 });
  const freshSessions = await db.collection("sessions").get();
  await Promise.all(freshSessions.docs.map((d) => d.ref.update({ accessStatus: "granted" })));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sidebar_main", { timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/02_dashboard_domain_mode.png` });

  logStep("3. Select a domain and start practice");
  // The domain checklist only appears once 'domain' mode is selected (default). Selecting the
  // first domain auto-loads a question (see toggleDomainFilter in Dashboard.tsx) - there's no
  // separate "start" button. Click the label's text, not .check() on the input directly: some
  // automation strategies can flip the native checkbox without dispatching a real click, which
  // silently never fires React's onChange at all.
  const peopleLabel = page.locator("#sidebar_nav label", { hasText: "People" });
  await peopleLabel.waitFor({ state: "visible", timeout: 10000 });
  await peopleLabel.locator("span").click();

  logStep("4. Answer the practice question once it loads");
  const optionA = page.locator("#option_A_btn");
  try {
    // Generous timeout: with a real GEMINI_API_KEY configured, question generation is a genuine
    // double-pass (creator + reviewer) round trip to the live API, which can take 15-30s+ on its
    // own, more with a 503/retry - vs. near-instant with the offline fallback bank.
    await optionA.waitFor({ state: "visible", timeout: 45000 });
    await page.screenshot({ path: `${OUT_DIR}/03_practice_question.png`, fullPage: true });

    logStep("4b. Toggle 'See Basis' BEFORE submitting (practice mode only - must reveal the correct answer)");
    const basisBtn = page.locator("#toggle_basis_btn");
    await basisBtn.click();
    await page.waitForTimeout(400);
    const coachingTrayPreSubmit = await page.locator("#coaching_tray").count();
    console.log("coaching_tray visible after 'See Basis' pre-submit (should be 1):", coachingTrayPreSubmit);
    await page.screenshot({ path: `${OUT_DIR}/03b_practice_see_basis.png`, fullPage: true });
    await basisBtn.click(); // hide it again
    await page.waitForTimeout(300);

    await optionA.click();
    await page.locator("#submit_answer_btn").click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT_DIR}/04_practice_feedback.png`, fullPage: true });
  } catch (e) {
    console.log("No question option found on screen - capturing DOM dump for inspection.");
    fs.writeFileSync(`${OUT_DIR}/04_no_question_dom.html`, await page.content());
  }

  logStep("5. Switch to Full Mock Exam mode");
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.locator("#mode_exam_btn").click();
    try {
      await page.locator("#view_mock_exam").waitFor({ state: "visible", timeout: 6000 });
      break;
    } catch (e) {
      console.log(`  retrying mode switch (attempt ${attempt})...`);
      if (attempt === 3) throw e;
    }
  }
  await page.screenshot({ path: `${OUT_DIR}/05_exam_landing.png` });

  logStep("6. Start the exam");
  const startExamBtn = page.locator("#start_exam_btn");
  await startExamBtn.waitFor({ state: "visible", timeout: 10000 });
  await startExamBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}/06_exam_q1.png`, fullPage: true });

  logStep("6b. Trigger scheduled Break 1 directly from the navigator and resume");
  await page.getByText("Break 1 (10 Min)").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/06b_break_screen.png`, fullPage: true });
  await page.getByText(/End Break & Continue Exam/i).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/06c_after_break_q11.png`, fullPage: true });
  // Jump back to Q1 via the navigator grid to continue the rest of the flow as before.
  await page.locator("button", { hasText: "01" }).first().click();
  await page.waitForTimeout(500);

  logStep("7. Answer exam Q1 and verify feedback is LOCKED (no coaching tray, no colors)");
  const examOptionA = page.locator("#option_A_btn");
  await examOptionA.waitFor({ state: "visible", timeout: 45000 });
  await examOptionA.click();
  await page.locator("#submit_answer_btn").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/07_exam_q1_after_submit.png`, fullPage: true });

  const coachingTrayVisible = await page.locator("#coaching_tray").count();
  const answerRecordedVisible = await page.locator("#answer_recorded_notice").count();
  console.log("coaching_tray present (should be 0 during locked exam):", coachingTrayVisible);
  console.log("answer_recorded_notice present (should be 1 during locked exam):", answerRecordedVisible);

  logStep("8. Move to next question via the visible Next button");
  const nextBtn = page.locator("#next_question_btn");
  await nextBtn.waitFor({ state: "visible", timeout: 5000 });
  await nextBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT_DIR}/08_exam_q2.png`, fullPage: true });

  logStep("9. Finish the exam and check the results + review screen");
  await page.locator("#finish_exam_btn").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/09_exam_results.png`, fullPage: true });

  const reviewBtn = page.locator("#review_exam_btn");
  if (await reviewBtn.count() > 0) {
    await reviewBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT_DIR}/10_exam_review_mode.png`, fullPage: true });
    const coachingTrayInReview = await page.locator("#coaching_tray").count();
    console.log("coaching_tray present in REVIEW mode (should be >=1 if Q1 was answered):", coachingTrayInReview);
  } else {
    console.log("Review button not found!");
  }

  logStep("10. Terminology Matching exercise: answer correctly and verify the score");
  // React.StrictMode (dev-only, see src/main.tsx) double-invokes the mount effect, so the view's
  // loadExercise() fires twice and the component ends up displaying whichever of the two random
  // fetches resolves LAST. Track the latest response here too (not the first) so this test reads
  // back the same exercise that's actually on screen.
  let exercisePayload = null;
  const matchingResponseHandler = async (r) => {
    if (r.url().includes("/api/matching-exercise") && r.status() === 200) {
      exercisePayload = await r.json();
    }
  };
  page.on("response", matchingResponseHandler);
  await page.locator("#mode_matching_btn").click();
  await page.waitForSelector("#view_matching_exercise", { timeout: 10000 });
  // Generous timeout: on first use after a fresh emulator restart, this triggers a real glossary
  // term extraction (Gemini) before falling back to the offline parser if quota is exhausted -
  // the retry/backoff cascade across both models can take 30s+ before that fallback lands.
  await page.waitForSelector('[id^="matching_term_select_"]', { timeout: 60000 });
  await page.waitForTimeout(800);
  page.off("response", matchingResponseHandler);

  if (exercisePayload && Array.isArray(exercisePayload.pairs) && exercisePayload.pairs.length > 0) {
    const pairs = exercisePayload.pairs;
    console.log(`Matching exercise loaded with ${pairs.length} pairs`);
    // Definitions are shuffled client-side, so map the API's known-correct definition text back to
    // its on-screen letter rather than assuming any fixed order.
    const definitionRows = await page.locator('#matching_exercise_body').locator('p.text-xs.text-slate-700').allTextContents();
    const letterForDefinitionText = (text) => {
      const idx = definitionRows.findIndex((d) => d.trim() === text.trim());
      return idx >= 0 ? String.fromCharCode(65 + idx) : null;
    };
    for (let i = 0; i < pairs.length; i++) {
      const correctLetter = letterForDefinitionText(pairs[i].definition);
      if (correctLetter) {
        await page.selectOption(`#matching_term_select_${i}`, { label: correctLetter });
      } else {
        consoleErrors.push(`Matching exercise: could not find on-screen definition for term "${pairs[i].term}"`);
      }
    }
    await page.locator("#check_matching_answers_btn").click();
    await page.waitForSelector("#matching_exercise_score", { timeout: 5000 });
    const scoreText = (await page.locator("#matching_exercise_score").textContent()).trim();
    console.log("Matching exercise score:", scoreText);
    if (!scoreText.includes(`${pairs.length} / ${pairs.length}`)) {
      consoleErrors.push(`Matching exercise: expected a perfect ${pairs.length}/${pairs.length} score, got "${scoreText}"`);
    }
    await page.screenshot({ path: `${OUT_DIR}/10_matching_exercise_checked.png`, fullPage: true });

    await page.locator("#new_matching_exercise_btn").click();
    await page.waitForTimeout(1000);
    if ((await page.locator("#matching_exercise_score").count()) !== 0) {
      consoleErrors.push("Matching exercise: score badge did not clear after starting a new exercise");
    }
  } else {
    consoleErrors.push("Matching exercise: API response was not captured or returned no pairs");
  }

  logStep("11. Switch UI language to French and back, check for crashes");
  const frBtn = page.locator("#sidebar_main").getByRole("button", { name: "FR", exact: true });
  await frBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/11_french_ui.png`, fullPage: true });
  const enBtn = page.locator("#sidebar_main").getByRole("button", { name: "EN", exact: true });
  await enBtn.click();
  await page.waitForTimeout(500);

  console.log("\n--- Console errors captured during the whole run ---");
  if (consoleErrors.length === 0) {
    console.log("(none)");
  } else {
    consoleErrors.forEach((e) => console.log(" -", e));
  }

  console.log("\n--- Console warnings (e.g. React dev warnings) captured during the whole run ---");
  const uniqueWarnings = [...new Set(consoleWarnings)];
  if (uniqueWarnings.length === 0) {
    console.log("(none)");
  } else {
    uniqueWarnings.forEach((w) => console.log(" -", w));
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
