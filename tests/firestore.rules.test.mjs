import test, { after, before, beforeEach } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { readFileSync } from "node:fs";

const PROJECT_ID = "demo-the-lobby-rules";
const ORG_A = "org-a";
const ORG_B = "org-b";
const CANDIDATE_UID = "candidate-user-a";
const OTHER_CANDIDATE_UID = "candidate-user-b";
const RECRUITER_A_UID = "recruiter-a";
const RECRUITER_B_UID = "recruiter-b";
const ADMIN_UID = "admin-user";
const CANDIDATE_A = "candidate-a";
const CANDIDATE_B = "candidate-b";
const JOB_A = "job-a";
const JOB_B = "job-b";
const APPLICATION_A = `${CANDIDATE_A}__${JOB_A}`;
const APPLICATION_B = `${CANDIDATE_B}__${JOB_B}`;

let testEnv;

async function seedDatabase() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = new Date();

    await Promise.all([
      setDoc(doc(db, "users", RECRUITER_A_UID), {
        uid: RECRUITER_A_UID,
        role: "RECRUITER",
        organizationId: ORG_A,
        status: "ACTIVE",
      }),
      setDoc(doc(db, "users", RECRUITER_B_UID), {
        uid: RECRUITER_B_UID,
        role: "RECRUITER",
        organizationId: ORG_B,
        status: "ACTIVE",
      }),
      setDoc(doc(db, "users", ADMIN_UID), {
        uid: ADMIN_UID,
        role: "ADMIN",
        organizationId: null,
        status: "ACTIVE",
      }),
      setDoc(doc(db, "candidates", CANDIDATE_A), {
        candidateId: CANDIDATE_A,
        authUid: CANDIDATE_UID,
        name: "Candidate A",
        phone: "010-1111-1111",
        email: "candidate-a@example.com",
        source: "B2C_SELF",
        accountStatus: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, "candidates", CANDIDATE_B), {
        candidateId: CANDIDATE_B,
        authUid: OTHER_CANDIDATE_UID,
        name: "Candidate B",
        phone: "010-2222-2222",
        email: "candidate-b@example.com",
        source: "B2C_SELF",
        accountStatus: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }),
      setDoc(doc(db, "profile", CANDIDATE_A), {
        candidateId: CANDIDATE_A,
        headline: "Candidate A",
        careerSummary: "Career A",
        skills: [],
        careers: [],
        education: [],
        profileCompleteness: 50,
        updatedAt: now,
      }),
      setDoc(doc(db, "profile", CANDIDATE_B), {
        candidateId: CANDIDATE_B,
        headline: "Candidate B",
        careerSummary: "Career B",
        skills: [],
        careers: [],
        education: [],
        profileCompleteness: 50,
        updatedAt: now,
      }),
      setDoc(doc(db, "jobs", JOB_A), {
        jobId: JOB_A,
        organizationId: ORG_A,
        recruiterId: RECRUITER_A_UID,
        status: "OPEN",
      }),
      setDoc(doc(db, "jobs", JOB_B), {
        jobId: JOB_B,
        organizationId: ORG_B,
        recruiterId: RECRUITER_B_UID,
        status: "OPEN",
      }),
      setDoc(doc(db, "applications", APPLICATION_A), {
        applicationId: APPLICATION_A,
        candidateId: CANDIDATE_A,
        jobId: JOB_A,
        organizationId: ORG_A,
        recruiterId: RECRUITER_A_UID,
        stage: "NEW",
      }),
      setDoc(doc(db, "applications", APPLICATION_B), {
        applicationId: APPLICATION_B,
        candidateId: CANDIDATE_B,
        jobId: JOB_B,
        organizationId: ORG_B,
        recruiterId: RECRUITER_B_UID,
        stage: "NEW",
      }),
    ]);
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedDatabase();
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test("Candidate can read only own Candidate document", async () => {
  const db = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  await assertSucceeds(getDoc(doc(db, "candidates", CANDIDATE_A)));
  await assertFails(getDoc(doc(db, "candidates", CANDIDATE_B)));
});

test("Candidate cannot create Candidate document directly", async () => {
  const uid = "candidate-new";
  const db = testEnv.authenticatedContext(uid).firestore();
  await assertFails(
    setDoc(doc(db, "candidates", "candidate-new-id"), {
      candidateId: "candidate-new-id",
      authUid: uid,
      name: "New Candidate",
      phone: "010-3333-3333",
      email: "new@example.com",
      source: "B2C_SELF",
      accountStatus: "ACTIVE",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
});

test("Candidate cannot update Candidate document directly", async () => {
  const db = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  await assertFails(
    updateDoc(doc(db, "candidates", CANDIDATE_A), {
      name: "Bypass Attempt",
      updatedAt: serverTimestamp(),
    })
  );
});

test("Candidate can read only own Profile", async () => {
  const db = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  await assertSucceeds(getDoc(doc(db, "profile", CANDIDATE_A)));
  await assertFails(getDoc(doc(db, "profile", CANDIDATE_B)));
});

test("Candidate cannot mutate Profile directly", async () => {
  const db = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  await assertFails(
    updateDoc(doc(db, "profile", CANDIDATE_A), {
      headline: "Bypass Attempt",
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(
    setDoc(doc(db, "profile", "new-profile"), {
      candidateId: "new-profile",
      headline: "Bypass Attempt",
      careerSummary: "",
      skills: [],
      careers: [],
      education: [],
      profileCompleteness: 0,
      updatedAt: serverTimestamp(),
    })
  );
});

test("Raw public Job documents are not anonymously readable", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "jobs", JOB_A)));
});

test("Recruiter reads only own-tenant Job", async () => {
  const db = testEnv.authenticatedContext(RECRUITER_A_UID).firestore();
  await assertSucceeds(getDoc(doc(db, "jobs", JOB_A)));
  await assertFails(getDoc(doc(db, "jobs", JOB_B)));
});

test("ADMIN can read Jobs across tenants", async () => {
  const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
  await assertSucceeds(getDoc(doc(db, "jobs", JOB_A)));
  await assertSucceeds(getDoc(doc(db, "jobs", JOB_B)));
});

test("Candidate reads only own Application", async () => {
  const db = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  await assertSucceeds(getDoc(doc(db, "applications", APPLICATION_A)));
  await assertFails(getDoc(doc(db, "applications", APPLICATION_B)));
});

test("Recruiter reads only own-tenant Application", async () => {
  const db = testEnv.authenticatedContext(RECRUITER_A_UID).firestore();
  await assertSucceeds(getDoc(doc(db, "applications", APPLICATION_A)));
  await assertFails(getDoc(doc(db, "applications", APPLICATION_B)));
});

test("Application writes are server-only", async () => {
  const candidateDb = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  const recruiterDb = testEnv.authenticatedContext(RECRUITER_A_UID).firestore();

  await assertFails(
    setDoc(doc(candidateDb, "applications", "fake-application"), {
      applicationId: "fake-application",
      candidateId: CANDIDATE_A,
      jobId: JOB_A,
      organizationId: ORG_A,
      stage: "NEW",
    })
  );
  await assertFails(
    updateDoc(doc(recruiterDb, "applications", APPLICATION_A), {
      stage: "INTERVIEW",
    })
  );
});

test("Consent and auth-link collections are server-only", async () => {
  const db = testEnv.authenticatedContext(CANDIDATE_UID).firestore();
  await assertFails(
    setDoc(doc(db, "candidateConsents", CANDIDATE_A), {
      candidateId: CANDIDATE_A,
      privacyConsent: true,
    })
  );
  await assertFails(
    setDoc(doc(db, "candidateAuthLinks", CANDIDATE_UID), {
      authUid: CANDIDATE_UID,
      candidateId: CANDIDATE_A,
    })
  );
});
