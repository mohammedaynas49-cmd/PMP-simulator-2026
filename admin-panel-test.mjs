// End-to-end check of the Admin Control Panel (Candidate Tracker + Simulator Rules tabs) against
// local emulators - see README "Testing against local emulators" for how to start them, then:
//   node admin-panel-test.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
import { chromium } from "playwright";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const adminApp = initializeApp({ projectId: firebaseConfig.projectId });
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const AUTH_EMULATOR_BASE = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
async function signUp(email, password) {
  const resp = await fetch(`${AUTH_EMULATOR_BASE}/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`signUp(${email}) failed: ${JSON.stringify(data)}`);
  return data.localId;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// Clean slate.
const existing = await db.collection("sessions").get();
await Promise.all(existing.docs.map((d) => d.ref.delete()));

// A second, non-admin candidate for the admin panel to manage. Unique email per run since the
// Auth emulator's user store persists across runs even after we clear Firestore sessions.
const candidateEmail = `candidate-${Date.now()}@test.local`;
const candidateUid = await signUp(candidateEmail, "password123");
await db.collection("sessions").doc(candidateUid).set({
  userId: candidateUid,
  email: candidateEmail,
  totalAnswered: 3,
  scorePercentage: 66,
  incorrectIds: [],
  answeredQuestions: {},
  mastery: {
    People: { answered: 1, correct: 1 },
    Process: { answered: 2, correct: 1 },
    "Business Environment": { answered: 0, correct: 0 }
  },
  role: "candidate",
  accessStatus: "granted",
  testsCount: 1
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.on("console", (msg) => { if (msg.type() === "error") console.log("[console:error]", msg.text()); });

console.log("\n=== 1. Guest login + bootstrap to admin ===");
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#auth_portal", { timeout: 20000 });
await page.locator("#guest_signin_btn").click();
await page.waitForSelector("#sidebar_main", { timeout: 15000 });
await page.waitForTimeout(800);

const snap = await db.collection("sessions").where("email", "==", "guest@candidate.com").get();
assert(snap.size === 1, `exactly one guest session created (found ${snap.size})`);
await snap.docs[0].ref.update({ role: "admin" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("#mode_admin_btn", { timeout: 15000 });
await page.waitForTimeout(1000);

console.log("\n=== 2. Open Admin Control Panel -> Candidate Tracker ===");
await page.locator("#mode_admin_btn").click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "smoke-screens/admin_users_tab.png", fullPage: true });

const pageText = await page.locator("body").innerText();
assert(pageText.includes(candidateEmail), "the seeded candidate appears in the Candidate Tracker");

console.log("\n=== 3. Toggle the candidate's access to Restricted, then back to Granted ===");
const candidateRow = page.locator("tr", { hasText: candidateEmail });
await candidateRow.waitFor({ state: "visible", timeout: 10000 });
const restrictBtn = candidateRow.getByRole("button", { name: /restrict/i });
await restrictBtn.click();
await page.waitForTimeout(1000);
const candidateDocAfterRestrict = await db.collection("sessions").doc(candidateUid).get();
assert(candidateDocAfterRestrict.data()?.accessStatus === "restricted", "candidate accessStatus flipped to 'restricted' in Firestore after admin action");
await page.screenshot({ path: "smoke-screens/admin_users_restricted.png", fullPage: true });

const grantBtn = candidateRow.getByRole("button", { name: /grant|unrestrict|allow/i });
await grantBtn.click();
await page.waitForTimeout(1000);
const candidateDocAfterGrant = await db.collection("sessions").doc(candidateUid).get();
assert(candidateDocAfterGrant.data()?.accessStatus === "granted", "candidate accessStatus flipped back to 'granted'");

console.log("\n=== 4. Promote the candidate to admin via the panel (exercises /api/admin/set-role) ===");
const promoteBtn = candidateRow.getByRole("button", { name: /promote|make admin|admin/i }).first();
await promoteBtn.click();
await page.waitForTimeout(1500);
const candidateDocAfterPromote = await db.collection("sessions").doc(candidateUid).get();
assert(candidateDocAfterPromote.data()?.role === "admin", "candidate role flipped to 'admin' in Firestore");

console.log("\n=== 5. Simulator Rules (settings) tab: change + save global config ===");
await page.getByRole("button", { name: /Simulator Rules|Règles/i }).click();
await page.waitForTimeout(500);
const timerInput = page.locator('input[type=number]').first();
const limitInput = page.locator('input[type=number]').nth(1);
await timerInput.fill("180");
await limitInput.fill("7");
await page.getByRole("button", { name: /Update Simulator Constraints|Enregistrer/i }).click();
await page.waitForTimeout(1000);

const configSnap = await db.collection("config").doc("settings").get();
console.log("config/settings after save:", JSON.stringify(configSnap.data()));
assert(configSnap.exists && configSnap.data()?.examTimerMinutes === 180, "examTimerMinutes persisted as 180 in Firestore");
assert(configSnap.exists && configSnap.data()?.maxTestsLimit === 7, "maxTestsLimit persisted as 7 in Firestore");
await page.screenshot({ path: "smoke-screens/admin_settings_tab.png", fullPage: true });

console.log("\n=== 6. Pending-approval access model: a brand-new sign-in is locked out until an admin approves it ===");
// A second, genuinely fresh guest session (its own browser context, own storage) - unlike the
// seeded candidate above, this one goes through the app's real client-side session-creation path
// (Dashboard.tsx), which is what actually sets accessStatus: 'pending' on a new account.
const newCandidateContext = await browser.newContext();
const newCandidatePage = await newCandidateContext.newPage();
await newCandidatePage.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await newCandidatePage.waitForSelector("#auth_portal", { timeout: 20000 });
await newCandidatePage.locator("#guest_signin_btn").click();
await newCandidatePage.waitForSelector("#access_locked_screen", { timeout: 15000 });
const pendingScreenText = await newCandidatePage.locator("body").innerText();
assert(
  pendingScreenText.includes("Pending Approval") || pendingScreenText.includes("attente d'approbation"),
  "a brand-new sign-in is locked out on the pending-approval screen, not the app"
);

const sessionsAfterNewSignIn = await db.collection("sessions").get();
const newCandidateUid = sessionsAfterNewSignIn.docs.find(d => d.id !== candidateUid && d.data().email !== candidateEmail)?.id
  || sessionsAfterNewSignIn.docs.find(d => d.data().accessStatus === "pending")?.id;
assert(!!newCandidateUid, "found the new pending candidate's session document");

await page.locator("#mode_admin_btn").click();
await page.waitForTimeout(500);
// Step 5 left the panel on the "Simulator Rules" sub-tab - switch back to "Candidate Tracker".
await page.getByRole("button", { name: /Candidate Tracker|Registre des Candidats/i }).click();
await page.waitForTimeout(500);
await fetchAllUsersBtn(page);
await page.waitForTimeout(1000);
// Only the brand-new candidate has a PENDING badge at this point in the test - locate its row by
// that rather than by uid substring, which is more robust to timing/ordering than matching text.
const newCandidateRow = page.locator("tr", { hasText: "PENDING" }).first();
await newCandidateRow.waitFor({ state: "visible", timeout: 10000 });
const approveBtn = newCandidateRow.getByRole("button", { name: /approve/i });
await approveBtn.click();
await page.waitForTimeout(1000);
const afterApproveDoc = await db.collection("sessions").doc(newCandidateUid).get();
assert(afterApproveDoc.data()?.accessStatus === "granted", "admin's 'Approve' action moves a pending account to 'granted'");

await newCandidatePage.reload({ waitUntil: "domcontentloaded" });
await newCandidatePage.waitForSelector("#sidebar_main", { timeout: 15000 });
assert(true, "the approved candidate now sees the real app after reloading");

await newCandidateContext.close();

await browser.close();
console.log(process.exitCode === 1 ? "\nSome checks FAILED." : "\nAll checks passed.");

async function fetchAllUsersBtn(p) {
  const refreshBtn = p.locator('button[title*="Refresh" i], button[title*="Rafraîchir" i]');
  if (await refreshBtn.count() > 0) {
    await refreshBtn.first().click();
    await p.waitForTimeout(800);
  }
}
