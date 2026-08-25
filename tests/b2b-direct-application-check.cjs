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
} = require("firebase-admin/firestore");

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS_NOT_SET"
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

const recruiterUid =
  "e2e-recruiter-jnc";

const candidateUid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";

let createdCandidateId = null;
let createdJobId = null;
let createdApplicationId = null;

async function exchangeCustomToken(uid) {
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND"
    );
  }

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

async function callApi(
  idToken,
  url,
  method,
  body
) {
  const response = await fetch(
    "http://localhost:3000" + url,
    {
      method,
      headers: {
        ...(body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
        Authorization: "Bearer " + idToken,
      },
      ...(body
        ? {
            body: JSON.stringify(body),
          }
        : {}),
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

async function cleanup() {
  try {
    const batch = db.batch();

    if (createdApplicationId) {
      const events = await db
        .collection("appEvents")
        .where(
          "applicationId",
          "==",
          createdApplicationId
        )
        .get();

      for (const eventDocument of events.docs) {
        batch.delete(eventDocument.ref);
      }

      batch.delete(
        db
          .collection("applications")
          .doc(createdApplicationId)
      );
    }

    if (createdCandidateId) {
      batch.delete(
        db
          .collection("profile")
          .doc(createdCandidateId)
      );

      batch.delete(
        db
          .collection("candidates")
          .doc(createdCandidateId)
      );
    }

    if (createdJobId) {
      batch.delete(
        db
          .collection("jobs")
          .doc(createdJobId)
      );
    }

    await batch.commit();

    console.log(
      "CLEANUP_FINISHED"
    );
  } catch (error) {
    console.error(
      "CLEANUP_FATAL:",
      error instanceof Error
        ? error.message
        : error
    );
    throw error;
  }
}

async function run() {
  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );

  console.log(
    "STEP_1: CREATE_OPEN_JOB"
  );

  const jobResult = await callApi(
    recruiterToken,
    "/api/b2b/jobs",
    "POST",
    {
      company:
        "Phase2 Direct Test Company",
      displayCompany:
        "Phase2 Direct Test Company",
      title:
        "Phase2 Direct E2E Job " +
        Date.now(),
      description:
        "B2B direct application E2E test job.",
      requirements: [
        "고객 응대 경험",
      ],
      preferredQualifications: [
        "리셉션 경력",
      ],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "DRAFT",
    }
  );

  console.log(
    "JOB_STATUS:",
    jobResult.status
  );

  if (
    jobResult.status !== 201 ||
    !jobResult.parsed?.success ||
    !jobResult.parsed?.data?.jobId
  ) {
    throw new Error(
      "OPEN_JOB_CREATE_FAILED"
    );
  }

  createdJobId =
    jobResult.parsed.data.jobId;

  await db
    .collection("jobs")
    .doc(createdJobId)
    .update({
      isTestData: true,
      status: "OPEN",
    });

  console.log(
    "CREATED_JOB_ID:",
    createdJobId
  );

  console.log(
    "STEP_2: CREATE_PASSIVE_CANDIDATE"
  );

  const marker = Date.now();

  const candidateResult = await callApi(
    recruiterToken,
    "/api/b2b/candidates",
    "POST",
    {
      name:
        "Phase2 Direct Candidate",
      phone:
        "010-9999-" +
        String(marker).slice(-4),
      email:
        `phase2.direct.${marker}@example.com`,
      headline:
        "리셉션 경력 후보자",
      careerSummary:
        "B2B Direct Application E2E candidate.",
      skills: [
        "고객응대",
        "안내데스크",
      ],
    }
  );

  console.log(
    "CANDIDATE_STATUS:",
    candidateResult.status
  );

  console.log(
    "CANDIDATE_BODY:",
    candidateResult.body
  );

  if (
    candidateResult.status !== 201 ||
    !candidateResult.parsed?.success ||
    !candidateResult.parsed?.data?.candidateId
  ) {
    throw new Error(
      "PASSIVE_CANDIDATE_CREATE_FAILED"
    );
  }

  createdCandidateId =
    candidateResult.parsed.data.candidateId;

  const candidateReference = db
    .collection("candidates")
    .doc(createdCandidateId);

  const candidateSnapshot =
    await candidateReference.get();

  const candidateData =
    candidateSnapshot.data();

  console.log(
    "CANDIDATE_SOURCE:",
    candidateData?.source
  );

  console.log(
    "CANDIDATE_AUTH_UID_IS_NULL:",
    candidateData?.authUid === null
  );

  console.log(
    "CANDIDATE_ORGANIZATION_ID:",
    candidateData?.organizationId
  );

  console.log(
    "CANDIDATE_CREATED_BY:",
    candidateData?.createdBy
  );

  if (
    candidateData?.source !== "B2B_DIRECT" ||
    candidateData?.authUid !== null ||
    candidateData?.organizationId !== "jnc" ||
    candidateData?.createdBy !== recruiterUid
  ) {
    throw new Error(
      "PASSIVE_CANDIDATE_INVARIANT_FAILED"
    );
  }

  console.log(
    "STEP_3: CROSS_TENANT_CANDIDATE_BLOCKED"
  );

  await candidateReference.update({
    organizationId:
      "e2e-other-org",
  });

  const crossTenantResult = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId:
        createdCandidateId,
      jobId:
        createdJobId,
    }
  );

  console.log(
    "CROSS_TENANT_STATUS:",
    crossTenantResult.status
  );

  console.log(
    "CROSS_TENANT_BODY:",
    crossTenantResult.body
  );

  if (
    crossTenantResult.status !== 403 ||
    crossTenantResult.parsed?.code !==
      "TENANT_ACCESS_DENIED"
  ) {
    throw new Error(
      "CROSS_TENANT_CANDIDATE_NOT_BLOCKED"
    );
  }

  await candidateReference.update({
    organizationId: "jnc",
  });

  console.log(
    "STEP_4: CREATE_B2B_DIRECT_APPLICATION"
  );

  const applicationResult = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId:
        createdCandidateId,
      jobId:
        createdJobId,
    }
  );

  console.log(
    "APPLICATION_STATUS:",
    applicationResult.status
  );

  console.log(
    "APPLICATION_BODY:",
    applicationResult.body
  );

  if (
    applicationResult.status !== 201 ||
    !applicationResult.parsed?.success ||
    !applicationResult.parsed?.data?.applicationId
  ) {
    throw new Error(
      "B2B_DIRECT_APPLICATION_CREATE_FAILED"
    );
  }

  createdApplicationId =
    applicationResult.parsed.data.applicationId;

  const applicationSnapshot = await db
    .collection("applications")
    .doc(createdApplicationId)
    .get();

  const applicationData =
    applicationSnapshot.data();

  console.log(
    "APPLICATION_SOURCE:",
    applicationData?.source
  );

  console.log(
    "APPLICATION_STAGE:",
    applicationData?.stage
  );

  console.log(
    "APPLICATION_ORGANIZATION_ID:",
    applicationData?.organizationId
  );

  if (
    applicationData?.source !== "B2B_DIRECT" ||
    applicationData?.stage !== "NEW" ||
    applicationData?.organizationId !== "jnc" ||
    applicationData?.candidateId !==
      createdCandidateId ||
    applicationData?.jobId !==
      createdJobId
  ) {
    throw new Error(
      "B2B_DIRECT_APPLICATION_DATA_FAILED"
    );
  }

  console.log(
    "STEP_5: VERIFY_AUDIT_EVENT"
  );

  const events = await db
    .collection("appEvents")
    .where(
      "applicationId",
      "==",
      createdApplicationId
    )
    .get();

  const createdEvent =
    events.docs
      .map((document) => document.data())
      .find(
        (event) =>
          event.type ===
          "APPLICATION_CREATED"
      );

  console.log(
    "EVENT_FOUND:",
    Boolean(createdEvent)
  );

  console.log(
    "EVENT_CHANGED_BY:",
    createdEvent?.changedBy
  );

  if (
    !createdEvent ||
    createdEvent.changedBy !== recruiterUid ||
    createdEvent.organizationId !== "jnc"
  ) {
    throw new Error(
      "B2B_DIRECT_AUDIT_EVENT_FAILED"
    );
  }

  console.log(
    "STEP_6: DUPLICATE_APPLICATION_BLOCKED"
  );

  const duplicateResult = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId:
        createdCandidateId,
      jobId:
        createdJobId,
    }
  );

  console.log(
    "DUPLICATE_STATUS:",
    duplicateResult.status
  );

  console.log(
    "DUPLICATE_BODY:",
    duplicateResult.body
  );

  if (
    duplicateResult.status !== 409 ||
    duplicateResult.parsed?.code !==
      "DUPLICATE_APPLICATION"
  ) {
    throw new Error(
      "DUPLICATE_APPLICATION_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_7: B2C_CANDIDATE_ACCESS_DENIED"
  );

  const candidateToken =
    await exchangeCustomToken(
      candidateUid
    );

  const deniedResult = await callApi(
    candidateToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId:
        createdCandidateId,
      jobId:
        createdJobId,
    }
  );

  console.log(
    "B2C_STATUS:",
    deniedResult.status
  );

  console.log(
    "B2C_BODY:",
    deniedResult.body
  );

  if (deniedResult.status !== 403) {
    throw new Error(
      "B2C_B2B_DIRECT_ACCESS_NOT_BLOCKED"
    );
  }

  console.log(
    "B2B_DIRECT_APPLICATION_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "B2B_DIRECT_APPLICATION_E2E_FAILED:",
      error instanceof Error
        ? error.stack || error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(cleanup);
