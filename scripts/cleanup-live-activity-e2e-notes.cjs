const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const TARGET_APPLICATION_ID =
  "xnHT4sEYN2wFjOZIEIcP__hansung-yuseong-reception-20260813";
const TARGET_JOB_ID = "hansung-yuseong-reception-20260813";
const TARGET_CANDIDATE_ID = "xnHT4sEYN2wFjOZIEIcP";
const TARGET_ORGANIZATION_ID = "jnc";
const TARGET_CHANGED_BY = "e2e-recruiter-jnc";
const NOTE_PATTERN = /^Phase2 activity E2E \d+$/;

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS_NOT_SET");
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || serviceAccount.project_id,
});

const db = getFirestore();

function isTargetE2ENote(data) {
  return (
    data.applicationId === TARGET_APPLICATION_ID &&
    data.organizationId === TARGET_ORGANIZATION_ID &&
    data.type === "NOTE_ADDED" &&
    data.changedBy === TARGET_CHANGED_BY &&
    typeof data.note === "string" &&
    NOTE_PATTERN.test(data.note)
  );
}

async function run() {
  const applicationRef = db.collection("applications").doc(TARGET_APPLICATION_ID);
  const applicationSnapshot = await applicationRef.get();

  if (!applicationSnapshot.exists) {
    throw new Error("TARGET_APPLICATION_NOT_FOUND");
  }

  const application = applicationSnapshot.data() || {};
  if (
    application.applicationId !== TARGET_APPLICATION_ID ||
    application.jobId !== TARGET_JOB_ID ||
    application.candidateId !== TARGET_CANDIDATE_ID ||
    application.organizationId !== TARGET_ORGANIZATION_ID ||
    application.isTestData === true
  ) {
    throw new Error("TARGET_APPLICATION_IDENTITY_MISMATCH");
  }

  const beforeSnapshot = await db
    .collection("appEvents")
    .where("applicationId", "==", TARGET_APPLICATION_ID)
    .get();

  const targetEvents = beforeSnapshot.docs.filter((doc) =>
    isTargetE2ENote(doc.data())
  );
  const preservedIds = beforeSnapshot.docs
    .filter((doc) => !isTargetE2ENote(doc.data()))
    .map((doc) => doc.id)
    .sort();

  const preservedTypes = beforeSnapshot.docs
    .filter((doc) => !isTargetE2ENote(doc.data()))
    .map((doc) => doc.data().type)
    .filter(Boolean);

  console.log(`TARGET_APPLICATION:${TARGET_APPLICATION_ID}`);
  console.log(`EVENT_COUNT_BEFORE:${beforeSnapshot.size}`);
  console.log(`E2E_NOTE_DELETE_COUNT:${targetEvents.length}`);
  console.log(`PRESERVED_EVENT_COUNT:${preservedIds.length}`);
  console.log(
    `PRESERVED_APPLICATION_CREATED:${preservedTypes.includes("APPLICATION_CREATED")}`
  );
  console.log(`PRESERVED_STAGE_CHANGED:${preservedTypes.includes("STAGE_CHANGED")}`);

  if (!preservedTypes.includes("APPLICATION_CREATED")) {
    throw new Error("APPLICATION_CREATED_BASELINE_NOT_FOUND");
  }

  if (targetEvents.length === 0) {
    console.log("NO_TARGET_E2E_NOTES_FOUND");
  } else {
    const batch = db.batch();
    targetEvents.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`DELETE_COMMITTED:${targetEvents.length}`);
  }

  const afterSnapshot = await db
    .collection("appEvents")
    .where("applicationId", "==", TARGET_APPLICATION_ID)
    .get();

  const remainingTargetEvents = afterSnapshot.docs.filter((doc) =>
    isTargetE2ENote(doc.data())
  );
  const afterIds = afterSnapshot.docs.map((doc) => doc.id).sort();

  const missingPreservedIds = preservedIds.filter((id) => !afterIds.includes(id));

  console.log(`EVENT_COUNT_AFTER:${afterSnapshot.size}`);
  console.log(`E2E_NOTE_REMAINING:${remainingTargetEvents.length}`);
  console.log(`PRESERVED_EVENT_MISSING:${missingPreservedIds.length}`);

  if (remainingTargetEvents.length !== 0) {
    throw new Error("TARGET_E2E_NOTES_REMAIN");
  }

  if (missingPreservedIds.length !== 0) {
    throw new Error(
      `PRESERVED_EVENTS_MISSING:${missingPreservedIds.join(",")}`
    );
  }

  const applicationReadback = await applicationRef.get();
  if (!applicationReadback.exists) {
    throw new Error("TARGET_APPLICATION_MISSING_AFTER_CLEANUP");
  }

  console.log("ACTIVITY_E2E_NOTE_CLEANUP_VERIFIED");
}

run().catch((error) => {
  console.error(
    "ACTIVITY_E2E_NOTE_CLEANUP_FAILED:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
