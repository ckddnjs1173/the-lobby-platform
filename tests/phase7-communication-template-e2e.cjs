const fs = require("fs");

const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  FieldValue,
  Timestamp,
  getFirestore,
} = require("firebase-admin/firestore");

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS_NOT_SET"
  );
}

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error(
    "NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND"
  );
}

const serviceAccount = JSON.parse(
  fs.readFileSync(
    serviceAccountPath,
    "utf8"
  )
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: "the-lobby-platform",
});

const auth = getAuth();
const db = getFirestore();
const baseUrl =
  process.env.E2E_BASE_URL ||
  "http://localhost:3000";
const recruiterUid =
  "e2e-recruiter-jnc";
const organizationId =
  "jnc";
const suffix =
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
const applicationId =
  `e2e-phase7-template-app-${suffix}`;
const interviewId =
  `e2e-phase7-template-interview-${suffix}`;
const internalNote =
  `INTERNAL_ONLY_${suffix}`;

function assert(
  condition,
  message,
  detail
) {
  if (condition) {
    return;
  }

  throw new Error(
    detail
      ? `${message}: ${detail}`
      : message
  );
}

async function exchangeCustomToken(uid) {
  const customToken =
    await auth.createCustomToken(uid);

  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const body = await response.json();

  if (!response.ok || !body.idToken) {
    throw new Error(
      "ID_TOKEN_EXCHANGE_FAILED"
    );
  }

  return body.idToken;
}

async function callTemplates(token) {
  const response = await fetch(
    `${baseUrl}/api/b2b/applications/${encodeURIComponent(
      applicationId
    )}/communications/templates`,
    {
      method: "GET",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    // Keep text for diagnostics.
  }

  assert(
    response.status === 200 &&
      parsed?.success === true &&
      Array.isArray(parsed?.data),
    "COMMUNICATION_TEMPLATE_API_FAILED",
    `${response.status} ${text}`
  );

  return parsed.data;
}

async function bootstrap() {
  const now = Date.now();
  const interviewAt =
    new Date(
      now + 48 * 60 * 60 * 1000
    );
  const batch = db.batch();

  batch.set(
    db.collection("applications").doc(applicationId),
    {
      applicationId,
      candidateId:
        `e2e-phase7-template-candidate-${suffix}`,
      jobId:
        `e2e-phase7-template-job-${suffix}`,
      organizationId,
      recruiterId: recruiterUid,
      stage: "INTERVIEW",
      source: "B2B_DIRECT",
      candidateSnapshot: {
        name: "Phase7 Template Candidate",
        phone: "010-7777-7000",
        email:
          `phase7-template-${suffix}@example.com`,
      },
      jobSnapshot: {
        title: "VIP Receptionist",
        company: "Phase7 Template Company",
      },
      appliedAt:
        Timestamp.fromMillis(now - 1000),
      updatedAt:
        Timestamp.fromMillis(now),
      lastActivityAt:
        Timestamp.fromMillis(now),
    }
  );

  batch.set(
    db.collection("interviews").doc(interviewId),
    {
      interviewId,
      applicationId,
      candidateId:
        `e2e-phase7-template-candidate-${suffix}`,
      jobId:
        `e2e-phase7-template-job-${suffix}`,
      organizationId,
      recruiterId: recruiterUid,
      scheduledAt:
        Timestamp.fromDate(interviewAt),
      method: "ONSITE",
      location: "Phase7 E2E Meeting Room",
      interviewer: "Phase7 E2E Interviewer",
      note: "internal interview note",
      status: "SCHEDULED",
      result: null,
      cancelReason: null,
      createdBy: recruiterUid,
      completedBy: null,
      canceledBy: null,
      createdAt:
        Timestamp.fromMillis(now),
      updatedAt:
        Timestamp.fromMillis(now),
      completedAt: null,
      canceledAt: null,
    }
  );

  await batch.commit();
}

async function cleanup() {
  try {
    await Promise.all([
      db.collection("applications")
        .doc(applicationId)
        .delete(),
      db.collection("interviews")
        .doc(interviewId)
        .delete(),
    ]);
  } catch (error) {
    console.error(
      "PHASE7_TEMPLATE_CLEANUP_FAILED:",
      error
    );
  }
}

async function main() {
  await bootstrap();
  const token =
    await exchangeCustomToken(
      recruiterUid
    );

  console.log(
    "STEP_1: INTERVIEW_TEMPLATE_USES_SCHEDULED_INTERVIEW"
  );

  const interviewTemplates =
    await callTemplates(token);
  const interviewTemplate =
    interviewTemplates.find(
      (item) =>
        item.key ===
        "INTERVIEW_SCHEDULED"
    );

  assert(
    interviewTemplate?.recommended === true &&
      interviewTemplate.body.includes(
        "Phase7 E2E Meeting Room"
      ) &&
      interviewTemplate.body.includes(
        "Phase7 E2E Interviewer"
      ) &&
      interviewTemplate.body.includes(
        "대면 면접"
      ),
    "INTERVIEW_TEMPLATE_DATA_MAPPING_FAILED",
    JSON.stringify(interviewTemplate)
  );

  console.log(
    "STEP_2: HIRED_TEMPLATE_USES_PLANNED_START_DATE"
  );

  await db
    .collection("applications")
    .doc(applicationId)
    .update({
      stage: "HIRED",
      hiringOutcome: {
        status: "HIRED",
        decidedAt:
          FieldValue.serverTimestamp(),
        decidedBy: recruiterUid,
        note: internalNote,
        plannedStartDate:
          "2026-09-01",
      },
      updatedAt:
        FieldValue.serverTimestamp(),
    });

  const hiredTemplates =
    await callTemplates(token);
  const hiredTemplate =
    hiredTemplates.find(
      (item) =>
        item.key ===
        "HIRED_CONFIRMATION"
    );

  assert(
    hiredTemplate?.recommended === true &&
      hiredTemplate.body.includes(
        "2026-09-01"
      ) &&
      !hiredTemplate.body.includes(
        internalNote
      ),
    "HIRED_TEMPLATE_DATA_MAPPING_FAILED",
    JSON.stringify(hiredTemplate)
  );

  console.log(
    "STEP_3: REJECTION_TEMPLATE_HIDES_INTERNAL_REASON"
  );

  await db
    .collection("applications")
    .doc(applicationId)
    .update({
      stage: "REJECTED",
      hiringOutcome: {
        status: "REJECTED",
        decidedAt:
          FieldValue.serverTimestamp(),
        decidedBy: recruiterUid,
        note: internalNote,
        plannedStartDate: null,
      },
      updatedAt:
        FieldValue.serverTimestamp(),
    });

  const rejectedTemplates =
    await callTemplates(token);
  const rejectedTemplate =
    rejectedTemplates.find(
      (item) =>
        item.key ===
        "REJECTION_NOTICE"
    );

  assert(
    rejectedTemplate?.recommended === true &&
      !rejectedTemplate.body.includes(
        internalNote
      ) &&
      rejectedTemplate.body.includes(
        "이번 전형은 여기서 마무리"
      ),
    "REJECTION_TEMPLATE_PRIVACY_FAILED",
    JSON.stringify(rejectedTemplate)
  );

  console.log(
    "PHASE7_COMMUNICATION_TEMPLATE_E2E_PASSED"
  );
}

main()
  .then(async () => {
    await cleanup();
    console.log("CLEANUP_FINISHED");
  })
  .catch(async (error) => {
    console.error(
      "PHASE7_COMMUNICATION_TEMPLATE_E2E_FAILED:",
      error
    );
    await cleanup();
    process.exit(1);
  });
