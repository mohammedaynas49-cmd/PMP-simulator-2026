import { readFileSync } from "fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

/**
 * Red Team validation suite for firestore.rules, covering the "Dirty Dozen" attack payloads
 * documented in security_spec.md. Every test asserts the attack is denied (assertFails) except
 * where a matching legitimate operation is used as a control to prove the rule isn't just
 * denying everything.
 *
 * Run with: npm run test:rules  (spins up the Firestore emulator, then tears it down)
 */

let testEnv: RulesTestEnvironment;

const VALID_QUESTION = {
  question_id: "pmp_2026_001",
  eco_domain: "People",
  scenario: "A scenario under 10000 characters.",
  options: ["A. one", "B. two", "C. three", "D. four"],
  correct_option: "A",
  explanation: "Because principle X applies.",
  pmbok_8_reference: "PMBOK 8 Principles: Team",
  methodology: "Agile/Hybrid",
  tags: ["Team Dynamics"]
};

function validSession(overrides: Record<string, unknown> = {}) {
  return {
    userId: "alice",
    email: "alice@example.com",
    totalAnswered: 0,
    scorePercentage: 0,
    incorrectIds: [],
    answeredQuestions: {},
    mastery: {
      People: { answered: 0, correct: 0 },
      Process: { answered: 0, correct: 0 },
      "Business Environment": { answered: 0, correct: 0 }
    },
    ...overrides
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "pmp-exam-simulator-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("questions collection", () => {
  it("allows any signed-in user to read questions", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "questions", "pmp_2026_001"), VALID_QUESTION);
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "questions", "pmp_2026_001")));
  });

  it("denies unauthenticated read of questions", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "questions", "pmp_2026_001"), VALID_QUESTION);
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "questions", "pmp_2026_001")));
  });

  // Question creation is server-only (Admin SDK, which bypasses these rules) - a client trying
  // to write directly, even with a perfectly well-formed payload, is denied. Every real write
  // (AI-generated or extracted from an uploaded book) already goes through the server; this rule
  // just removes an unused door a malicious/compromised client could otherwise inject through.
  it("denies a verified user from creating a question directly, even a well-formed one", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(alice, "questions", "pmp_2026_001"), VALID_QUESTION));
  });

  // Dirty Dozen #4: Question Deletion Attack
  it("denies deleting an existing question, even for its creator", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "questions", "pmp_2026_001"), VALID_QUESTION);
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(alice, "questions", "pmp_2026_001")));
  });

  // Dirty Dozen #5: Question Alteration Attack (Explanation Poisoning)
  it("denies updating an existing question's correct answer or explanation", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "questions", "pmp_2026_001"), VALID_QUESTION);
    });
    const attacker = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(
      updateDoc(doc(attacker, "questions", "pmp_2026_001"), {
        correct_option: "B",
        explanation: "Poisoned explanation."
      })
    );
  });

  // Dirty Dozen #6: Denial of Wallet (ID Poisoning) via an oversized document id.
  // Firestore's own protocol caps document IDs at 1500 bytes and rejects anything larger before
  // security rules even run, so this uses an id that is legal for Firestore itself (under that
  // hard cap) but still well over our app's 128-character isValidId() limit, to actually exercise
  // the rule's own ID-poisoning defense rather than the SDK's unrelated protocol limit.
  it("denies creating a question under an oversized junk id", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    const junkId = "a".repeat(500);
    await assertFails(setDoc(doc(alice, "questions", junkId), VALID_QUESTION));
  });

  it("denies a question payload missing required fields", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    const { explanation, ...incomplete } = VALID_QUESTION;
    await assertFails(setDoc(doc(alice, "questions", "pmp_2026_002"), incomplete));
  });

  it("denies a client from creating an extracted question directly, even with valid source_book_id/grounded_book_name", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "questions", "extracted_book1_0"), {
        ...VALID_QUESTION,
        question_id: "extracted_book1_0",
        source_book_id: "book1",
        grounded_book_name: "PMBOK Guide 8th Edition"
      })
    );
  });

  it("denies a question with an oversized source_book_id", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "questions", "pmp_2026_003"), {
        ...VALID_QUESTION,
        question_id: "pmp_2026_003",
        source_book_id: "a".repeat(200)
      })
    );
  });
});

describe("sessions collection", () => {
  // Dirty Dozen #1: Unauthenticated Read of User Session
  it("denies an unauthenticated read of a user session", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "sessions", "alice"), validSession());
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "sessions", "alice")));
  });

  it("denies listing other candidates' sessions", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "sessions", "alice"), validSession({ userId: "alice" }));
      await setDoc(doc(ctx.firestore(), "sessions", "bob"), validSession({ userId: "bob", email: "bob@example.com" }));
    });
    const mallory = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(getDocs(collection(mallory, "sessions")));
  });

  it("allows a candidate to create their own session with default role", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(alice, "sessions", "alice"), validSession({ userId: "alice" }))
    );
  });

  // Dirty Dozen #2: Identity Spoofing / Session Takeover
  it("denies user A writing to user B's session", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "sessions", "bob"), validSession({ userId: "bob", email: "bob@example.com" }))
    );
  });

  // Dirty Dozen #3: Privilege Escalation (Role Injection) - on creation
  it("denies a brand-new session self-creating with role: admin", async () => {
    const mallory = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(
      setDoc(
        doc(mallory, "sessions", "mallory"),
        validSession({ userId: "mallory", email: "mallory@example.com", role: "admin" })
      )
    );
  });

  // Same attack attempted via update once the (candidate) session already exists
  it("denies a candidate promoting themselves to admin via update", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "sessions", "mallory"),
        validSession({ userId: "mallory", email: "mallory@example.com", role: "candidate" })
      );
    });
    const mallory = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(updateDoc(doc(mallory, "sessions", "mallory"), { role: "admin" }));
  });

  it("allows an admin to promote another candidate's role", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "sessions", "admin-user"),
        validSession({ userId: "admin-user", email: "admin@example.com", role: "admin" })
      );
      await setDoc(
        doc(ctx.firestore(), "sessions", "alice"),
        validSession({ userId: "alice", role: "candidate" })
      );
    });
    const admin = testEnv.authenticatedContext("admin-user").firestore();
    await assertSucceeds(
      updateDoc(doc(admin, "sessions", "alice"), {
        ...validSession({ userId: "alice", role: "admin" })
      })
    );
  });

  // Dirty Dozen #7: Score Value Poisoning
  it("denies a scorePercentage above 100 or below 0", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "sessions", "alice"), validSession({ userId: "alice", scorePercentage: 150 }))
    );
    await assertFails(
      setDoc(doc(alice, "sessions", "alice"), validSession({ userId: "alice", scorePercentage: -10 }))
    );
  });

  // Dirty Dozen #8: Malicious Empty Write
  it("denies an empty-object write bypassing required schema fields", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(alice, "sessions", "alice"), {}));
  });

  // Dirty Dozen #10: Session Bypass of Required Fields
  it("denies a session write missing incorrectIds or mastery", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    const full = validSession({ userId: "alice" }) as Record<string, unknown>;
    const { incorrectIds, ...missingIncorrectIds } = full;
    await assertFails(setDoc(doc(alice, "sessions", "alice"), missingIncorrectIds));

    const { mastery, ...missingMastery } = full;
    await assertFails(setDoc(doc(alice, "sessions", "alice"), missingMastery));
  });

  // Dirty Dozen #11: Malicious Email Spoofing (claiming another verified identity)
  it("denies a session whose email/userId don't match the authenticated uid", async () => {
    const mallory = testEnv.authenticatedContext("mallory", { email: "mallory@example.com" }).firestore();
    await assertFails(
      setDoc(
        doc(mallory, "sessions", "mallory"),
        validSession({ userId: "victim-uid", email: "victim@example.com" })
      )
    );
  });

  // Dirty Dozen #12: Bypassing Query Safety (listing without a uid filter)
  it("allows a filtered query matching the caller's own uid, but not an unfiltered list", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "sessions", "alice"), validSession({ userId: "alice" }));
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      getDocs(query(collection(alice, "sessions"), where("userId", "==", "alice")))
    );
    await assertFails(getDocs(collection(alice, "sessions")));
  });

  it("allows a candidate to read and delete only their own session", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "sessions", "alice"), validSession({ userId: "alice" }));
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "sessions", "alice")));
    await assertSucceeds(deleteDoc(doc(alice, "sessions", "alice")));
  });
});

describe("admin custom claim (POST /api/admin/set-role)", () => {
  // isAdmin() checks the `admin` custom claim first (see firestore.rules); this claim can only
  // ever be minted by the trusted server endpoint via the Admin SDK (verified end-to-end against
  // the Auth + Firestore emulators together in test-admin-endpoint.mjs). Here we only prove the
  // RULE itself honors the claim - with no Firestore session document backing it at all - which
  // is the whole point of moving off a per-check Firestore read.
  it("lets a user with the admin custom claim write config with no session document at all", async () => {
    const admin = testEnv.authenticatedContext("admin-user", { admin: true }).firestore();
    await assertSucceeds(
      setDoc(doc(admin, "config", "settings"), { examTimerMinutes: 230, maxTestsLimit: 5 })
    );
  });

  it("still denies a forged claim-less user even with a matching uid naming pattern", async () => {
    const notAdmin = testEnv.authenticatedContext("admin-user", { admin: false }).firestore();
    await assertFails(
      setDoc(doc(notAdmin, "config", "settings"), { examTimerMinutes: 230, maxTestsLimit: 5 })
    );
  });
});

describe("config collection", () => {
  it("denies a non-admin writing global exam config", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "sessions", "alice"),
        validSession({ userId: "alice", role: "candidate" })
      );
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "config", "settings"), { examTimerMinutes: 230, maxTestsLimit: 5 })
    );
  });

  it("allows an admin to write valid global exam config", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "sessions", "admin-user"),
        validSession({ userId: "admin-user", email: "admin@example.com", role: "admin" })
      );
    });
    const admin = testEnv.authenticatedContext("admin-user").firestore();
    await assertSucceeds(
      setDoc(doc(admin, "config", "settings"), { examTimerMinutes: 230, maxTestsLimit: 5 })
    );
  });

  it("denies an admin writing out-of-range config values", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "sessions", "admin-user"),
        validSession({ userId: "admin-user", email: "admin@example.com", role: "admin" })
      );
    });
    const admin = testEnv.authenticatedContext("admin-user").firestore();
    await assertFails(
      setDoc(doc(admin, "config", "settings"), { examTimerMinutes: 5000, maxTestsLimit: 5 })
    );
  });
});

describe("books collection", () => {
  it("denies an unauthenticated user from reading, writing, or deleting study books", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "books", "book_1"), { id: "book_1", name: "Sample.pdf" });
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "books", "book_1")));
    await assertFails(setDoc(doc(anon, "books", "book_2"), { id: "book_2", name: "Injected.pdf" }));
    await assertFails(deleteDoc(doc(anon, "books", "book_1")));
  });

  it("allows a signed-in non-admin user to read study books, but not upload or delete them", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "books", "book_1"), { id: "book_1", name: "Sample.pdf" });
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "books", "book_1")));
    // Book upload/management is admin-only: every legitimate write happens server-side via the
    // Admin SDK (which bypasses these rules), so a non-admin's direct client-SDK write here would
    // only ever be an attempt to inject fabricated "study material" straight into Firestore.
    await assertFails(setDoc(doc(alice, "books", "book_2"), { id: "book_2", name: "Injected.pdf" }));
    await assertFails(deleteDoc(doc(alice, "books", "book_1")));
  });

  it("allows an admin to upload and delete a study book", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "books", "book_1"), { id: "book_1", name: "Sample.pdf" });
      await setDoc(
        doc(ctx.firestore(), "sessions", "admin-user"),
        validSession({ userId: "admin-user", email: "admin@example.com", role: "admin" })
      );
    });
    const admin = testEnv.authenticatedContext("admin-user").firestore();
    await assertSucceeds(setDoc(doc(admin, "books", "book_2"), { id: "book_2", name: "MyNotes.pdf" }));
    await assertSucceeds(deleteDoc(doc(admin, "books", "book_1")));
  });
});
