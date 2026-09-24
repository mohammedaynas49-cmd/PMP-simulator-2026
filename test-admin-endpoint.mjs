// Manual end-to-end integration check for POST /api/admin/set-role (custom claim promotion),
// exercised against real Firebase Auth + Firestore emulators - not against a live project, and
// not wired into `npm test` (it needs a running server, unlike firestore.rules.test.ts).
//
// How to run:
//   1. firebase emulators:start --only firestore,auth --project seismic-stream-gcf5x
//   2. In another shell: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run dev
//   3. node test-admin-endpoint.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const adminApp = initializeApp({ projectId: firebaseConfig.projectId });
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const adminAuth = getAuth(adminApp);

const AUTH_EMULATOR_BASE = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const SERVER_BASE = "http://127.0.0.1:3000";

async function signUp(email, password) {
  const resp = await fetch(`${AUTH_EMULATOR_BASE}/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`signUp(${email}) failed: ${JSON.stringify(data)}`);
  return { uid: data.localId, idToken: data.idToken };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

async function main() {
  // --- Setup: two fresh emulator users, one manually bootstrapped as admin via Firestore role ---
  const admin = await signUp("admin@test.local", "password123");
  const alice = await signUp("alice@test.local", "password123");
  const mallory = await signUp("mallory@test.local", "password123");

  const baseSession = (uid, email) => ({
    userId: uid,
    email,
    totalAnswered: 0,
    scorePercentage: 0,
    incorrectIds: [],
    answeredQuestions: {},
    mastery: {
      People: { answered: 0, correct: 0 },
      Process: { answered: 0, correct: 0 },
      "Business Environment": { answered: 0, correct: 0 }
    }
  });

  // Simulates the one-time manual Firebase-console bootstrap described in the README: the
  // Firestore role is 'admin' already, but no custom claim has been minted yet.
  await db.collection("sessions").doc(admin.uid).set({ ...baseSession(admin.uid, "admin@test.local"), role: "admin" });
  await db.collection("sessions").doc(alice.uid).set({ ...baseSession(alice.uid, "alice@test.local"), role: "candidate" });
  await db.collection("sessions").doc(mallory.uid).set({ ...baseSession(mallory.uid, "mallory@test.local"), role: "candidate" });

  // --- Test 1: unauthenticated request is rejected ---
  {
    const resp = await fetch(`${SERVER_BASE}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUid: alice.uid, makeAdmin: true })
    });
    assert(resp.status === 401, `unauthenticated request rejected (got ${resp.status})`);
  }

  // --- Test 2: a non-admin candidate cannot promote themselves or anyone else ---
  {
    const resp = await fetch(`${SERVER_BASE}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mallory.idToken}` },
      body: JSON.stringify({ targetUid: mallory.uid, makeAdmin: true })
    });
    assert(resp.status === 403, `non-admin self-promotion rejected (got ${resp.status})`);
    const malloryUser = await adminAuth.getUser(mallory.uid);
    assert(malloryUser.customClaims?.admin !== true, "mallory did NOT get the admin claim");
  }

  // --- Test 3: the console-bootstrapped admin (role:'admin', no claim yet) CAN call the endpoint
  //     on themselves - this is exactly the one-time sync the app's own client code performs ---
  {
    const resp = await fetch(`${SERVER_BASE}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.idToken}` },
      body: JSON.stringify({ targetUid: admin.uid, makeAdmin: true })
    });
    assert(resp.ok, `bootstrap admin can mint their own claim via the Firestore-role fallback (got ${resp.status})`);
    const adminUser = await adminAuth.getUser(admin.uid);
    assert(adminUser.customClaims?.admin === true, "admin's Firebase Auth account now carries the admin custom claim");
  }

  // --- Test 4: the (now claim-bearing) admin promotes Alice; verify claim + Firestore mirror ---
  {
    const resp = await fetch(`${SERVER_BASE}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.idToken}` },
      body: JSON.stringify({ targetUid: alice.uid, makeAdmin: true })
    });
    assert(resp.ok, `admin can promote alice (got ${resp.status})`);
    const aliceUser = await adminAuth.getUser(alice.uid);
    assert(aliceUser.customClaims?.admin === true, "alice's Firebase Auth account now carries the admin custom claim");
    const aliceDoc = await db.collection("sessions").doc(alice.uid).get();
    assert(aliceDoc.data()?.role === "admin", "alice's Firestore session role mirror updated to 'admin'");
  }

  // --- Test 5: alice's ID token was minted at signUp time and has never been refreshed, so it
  //     carries no custom claim - but the endpoint re-reads her Firestore role live on every
  //     request (not from the token), and test 4 just set it to 'admin', so the fallback path
  //     lets her act as admin immediately without forcing a re-login. ---
  {
    const resp = await fetch(`${SERVER_BASE}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${alice.idToken}` },
      body: JSON.stringify({ targetUid: mallory.uid, makeAdmin: true })
    });
    assert(resp.ok, `alice's stale token still works via the live Firestore-role fallback (got ${resp.status})`);
    const malloryUser = await adminAuth.getUser(mallory.uid);
    assert(malloryUser.customClaims?.admin === true, "mallory promoted by alice now carries the admin custom claim");
  }

  // --- Test 6: demote mallory back to candidate and confirm the claim is cleared ---
  {
    const resp = await fetch(`${SERVER_BASE}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.idToken}` },
      body: JSON.stringify({ targetUid: mallory.uid, makeAdmin: false })
    });
    assert(resp.ok, `admin can demote mallory (got ${resp.status})`);
    const malloryUser = await adminAuth.getUser(mallory.uid);
    assert(malloryUser.customClaims?.admin !== true, "mallory's admin custom claim was cleared after demotion");
  }

  console.log(process.exitCode === 1 ? "\nSome checks FAILED." : "\nAll checks passed.");
}

main().catch(err => {
  console.error("Script error:", err);
  process.exit(1);
});
