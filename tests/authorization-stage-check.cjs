const fs = require("fs");

const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS_NOT_SET");
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: "the-lobby-platform",
});

const db = getFirestore();
const auth = getAuth();

const candidateUid = "AywBaN2alaX56v3h8FRFd3M9FD02";
const otherOrgId = "e2e-other-org";
const otherRecruiterUid = "e2e-recruiter-other-org";
const otherRecruiterEmail = "e2e.recruiter.other@example.com";
const marker = Date.now();
const applicationId = `e2e-authorization-stage-${marker}`;

async function exchangeCustomToken(uid) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND");
  }

  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const body = await response.json();

  if (!response.ok || !body.idToken) {
    throw new Error("ID_TOKEN_EXCHANGE_FAILED");
  }

  return body.idToken;
}

async function callStageApi(idToken, stage) {
  const response = await fetch(
    "http://localhost:3000/api/applications/" +
      encodeURIComponent(applicationId) +
      "/stage",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ stage }),
    }
  );

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    // keep raw response for diagnostics
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

async function bootstrapOtherTenant() {
  const organizationReference = db.collection("organizations").doc(otherOrgId);
  const organizationSnapshot = await organizationReference.get();

  if (!organizationSnapshot.exists) {
    await organizationReference.set({
      organizationId: otherOrgId,
      name: "E2E Other Organization",
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  try {
    await auth.getUser(otherRecruiterUid);
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      await auth.createUser({
        uid: otherRecruiterUid,
        email: otherRecruiterEmail,
        emailVerified: true,
        disabled: false,
      });
    } else {
      throw error;
    }
  }

  const userReference = db.collection("users").doc(otherRecruiterUid);
  const userSnapshot = await userReference.get();

  if (!userSnapshot.exists) {
    await userReference.set({
      uid: otherRecruiterUid,
      email: otherRecruiterEmail,
      name: "E2E Other Recruiter",
      role: "RECRUITER",
      organizationId: otherOrgId,
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

async function seedTestApplication() {
  const serverTimestamp = FieldValue.serverTimestamp();

  await db.collection("applications").doc(applicationId).set({
    applicationId,
    candidateId: `e2e-stage-candidate-${marker}`,
    jobId: `e2e-stage-job-${marker}`,
    organizationId: "jnc",
    recruiterId: "e2e-recruiter-jnc",
    stage: "NEW",
    source: "B2B_DIRECT",
    candidateSnapshot: {
      name: "E2E Authorization Candidate",
      phone: "010-0000-0000",
      email: `e2e.authorization.${marker}@example.com`,
    },
    jobSnapshot: {
      title: "E2E Authorization Stage Fixture",
      company: "E2E Test",
    },
    isTestData: true,
    appliedAt: serverTimestamp,
    updatedAt: serverTimestamp,
    lastActivityAt: serverTimestamp,
  });
}

async function verifyUnchangedDatabase() {
  const applicationSnapshot = await db
    .collection("applications")
    .doc(applicationId)
    .get();

  if (!applicationSnapshot.exists) {
    throw new Error("AUTH_STAGE_FIXTURE_MISSING");
  }

  const application = applicationSnapshot.data();
  const eventSnapshots = await db
    .collection("appEvents")
    .where("applicationId", "==", applicationId)
    .get();

  console.log("FINAL_STAGE:", application?.stage);
  console.log("FINAL_EVENT_COUNT:", eventSnapshots.size);

  if (application?.stage !== "NEW") {
    throw new Error("UNAUTHORIZED_STAGE_MUTATION_OCCURRED");
  }

  if (!eventSnapshots.empty) {
    throw new Error("UNAUTHORIZED_STAGE_EVENT_CREATED");
  }
}

async function cleanupOnce() {
  const events = await db
    .collection("appEvents")
    .where("applicationId", "==", applicationId)
    .get();
  const batch = db.batch();
  events.docs.forEach((document) => batch.delete(document.ref));
  batch.delete(db.collection("applications").doc(applicationId));
  await batch.commit();

  const application = await db.collection("applications").doc(applicationId).get();
  const remainingEvents = await db
    .collection("appEvents")
    .where("applicationId", "==", applicationId)
    .get();

  if (application.exists || !remainingEvents.empty) {
    throw new Error("AUTH_STAGE_FIXTURE_CLEANUP_READBACK_FAILED");
  }
}

async function cleanup() {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await cleanupOnce();
      console.log("CLEANUP_FINISHED");
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `CLEANUP_ATTEMPT_${attempt}_FAILED:`,
        error instanceof Error ? error.message : error
      );
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError || new Error("AUTH_STAGE_FIXTURE_CLEANUP_FAILED");
}

async function run() {
  console.log("STEP_0: SEED_ISOLATED_TEST_APPLICATION");
  await seedTestApplication();

  console.log("STEP_1: CANDIDATE_STAGE_ATTACK");
  const candidateToken = await exchangeCustomToken(candidateUid);
  const candidateResult = await callStageApi(candidateToken, "INTERVIEW");

  console.log("CANDIDATE_STAGE_STATUS:", candidateResult.status);

  if (candidateResult.status !== 403) {
    throw new Error("CANDIDATE_STAGE_ATTACK_NOT_BLOCKED");
  }

  console.log("STEP_2: BOOTSTRAP_OTHER_TENANT");
  await bootstrapOtherTenant();
  console.log("OTHER_TENANT_READY: true");

  console.log("STEP_3: CROSS_TENANT_STAGE_ATTACK");
  const recruiterToken = await exchangeCustomToken(otherRecruiterUid);
  const recruiterResult = await callStageApi(recruiterToken, "INTERVIEW");

  console.log("CROSS_TENANT_STAGE_STATUS:", recruiterResult.status);

  if (recruiterResult.status !== 403) {
    throw new Error("CROSS_TENANT_STAGE_ATTACK_NOT_BLOCKED");
  }

  console.log("STEP_4: VERIFY_UNCHANGED_DATABASE");
  await verifyUnchangedDatabase();
  console.log("AUTHORIZATION_STAGE_CHECK_FINISHED");
}

(async () => {
  let failure = null;

  try {
    await run();
  } catch (error) {
    failure = error;
    console.error(
      "TEST_FAILED:",
      error instanceof Error ? error.message : error
    );
  }

  try {
    await cleanup();
  } catch (error) {
    if (!failure) failure = error;
    console.error(
      "CLEANUP_FAILED:",
      error instanceof Error ? error.message : error
    );
  }

  if (failure) {
    process.exit(1);
  }

  process.exit(0);
})();
