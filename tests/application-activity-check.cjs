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

const auth = getAuth();
const db = getFirestore();

const recruiterUid = "e2e-recruiter-jnc";
const candidateUid = "AywBaN2alaX56v3h8FRFd3M9FD02";
const marker = Date.now();
const applicationId = `e2e-application-activity-${marker}`;
let createdEventId = null;

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

async function seedTestApplication() {
  const serverTimestamp = FieldValue.serverTimestamp();

  await db.collection("applications").doc(applicationId).set({
    applicationId,
    candidateId: `e2e-activity-candidate-${marker}`,
    jobId: `e2e-activity-job-${marker}`,
    organizationId: "jnc",
    recruiterId: recruiterUid,
    stage: "NEW",
    source: "B2B_DIRECT",
    candidateSnapshot: {
      name: "E2E Activity Candidate",
      phone: "010-0000-0000",
      email: `e2e.activity.${marker}@example.com`,
    },
    jobSnapshot: {
      title: "E2E Activity Fixture",
      company: "E2E Test",
    },
    isTestData: true,
    appliedAt: serverTimestamp,
    updatedAt: serverTimestamp,
    lastActivityAt: serverTimestamp,
  });
}

async function callActivityApi(idToken, method, body) {
  const response = await fetch(
    "http://localhost:3000/api/b2b/applications/" +
      encodeURIComponent(applicationId) +
      "/activity",
    {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${idToken}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    // keep raw body for diagnostics
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
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
    throw new Error("ACTIVITY_FIXTURE_CLEANUP_READBACK_FAILED");
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

  throw lastError || new Error("ACTIVITY_FIXTURE_CLEANUP_FAILED");
}

async function run() {
  console.log("STEP_0: SEED_ISOLATED_TEST_APPLICATION");
  await seedTestApplication();

  console.log("STEP_1: RECRUITER_ACTIVITY_READ");
  const recruiterToken = await exchangeCustomToken(recruiterUid);
  const before = await callActivityApi(recruiterToken, "GET");

  console.log("READ_STATUS:", before.status);

  if (
    before.status !== 200 ||
    !before.parsed?.success ||
    !Array.isArray(before.parsed?.data) ||
    before.parsed.data.length !== 0
  ) {
    throw new Error("ACTIVITY_READ_FAILED");
  }

  console.log("STEP_2: RECRUITER_ADD_NOTE");
  const noteMarker = `Phase2 activity E2E ${marker}`;
  const createResult = await callActivityApi(recruiterToken, "POST", {
    note: noteMarker,
  });
  const created = createResult.parsed?.data;

  console.log("NOTE_STATUS:", createResult.status);

  if (
    createResult.status !== 201 ||
    !createResult.parsed?.success ||
    created?.type !== "NOTE_ADDED" ||
    created?.changedBy !== recruiterUid ||
    created?.note !== noteMarker
  ) {
    throw new Error("ACTIVITY_NOTE_CREATE_FAILED");
  }

  createdEventId = created.eventId;

  console.log("STEP_3: VERIFY_FIRESTORE_EVENT");
  const eventSnapshot = await db
    .collection("appEvents")
    .doc(createdEventId)
    .get();

  if (!eventSnapshot.exists) {
    throw new Error("ACTIVITY_EVENT_NOT_FOUND");
  }

  const event = eventSnapshot.data();

  if (
    event?.type !== "NOTE_ADDED" ||
    event?.applicationId !== applicationId ||
    event?.organizationId !== "jnc" ||
    event?.changedBy !== recruiterUid ||
    event?.note !== noteMarker
  ) {
    throw new Error("ACTIVITY_EVENT_DATA_INVALID");
  }

  console.log("STEP_4: VERIFY_ACTIVITY_READBACK");
  const after = await callActivityApi(recruiterToken, "GET");
  const found =
    Array.isArray(after.parsed?.data) &&
    after.parsed.data.some(
      (item) => item.eventId === createdEventId && item.note === noteMarker
    );

  console.log("READBACK_STATUS:", after.status);
  console.log("CREATED_EVENT_IN_TIMELINE:", found);

  if (after.status !== 200 || !found) {
    throw new Error("ACTIVITY_READBACK_FAILED");
  }

  console.log("STEP_5: B2C_CANDIDATE_ACCESS_DENIED");
  const candidateToken = await exchangeCustomToken(candidateUid);
  const candidateRead = await callActivityApi(candidateToken, "GET");

  console.log("CANDIDATE_READ_STATUS:", candidateRead.status);

  if (candidateRead.status !== 403) {
    throw new Error("B2C_ACTIVITY_ACCESS_NOT_BLOCKED");
  }

  console.log("APPLICATION_ACTIVITY_E2E_FINISHED");
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
