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

let createdJobId = null;

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
    // keep text for diagnostics
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

async function cleanup() {
  if (!createdJobId) {
    return;
  }

  try {
    await db
      .collection("jobs")
      .doc(createdJobId)
      .delete();

    console.log(
      "CLEANUP_JOB_DELETED:",
      createdJobId
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
    "STEP_1: RECRUITER_JOB_LIST"
  );

  const before = await callApi(
    recruiterToken,
    "/api/b2b/jobs",
    "GET"
  );

  console.log(
    "LIST_STATUS:",
    before.status
  );

  if (
    before.status !== 200 ||
    !before.parsed?.success ||
    !Array.isArray(before.parsed?.data)
  ) {
    throw new Error(
      "JOB_LIST_FAILED"
    );
  }

  console.log(
    "STEP_2: RECRUITER_CREATE_DRAFT_JOB"
  );

  const marker =
    "Phase2 E2E Job " + Date.now();

  const createResult = await callApi(
    recruiterToken,
    "/api/b2b/jobs",
    "POST",
    {
      company: "Phase2 Test Company",
      displayCompany: "Phase2 Test Company",
      title: marker,
      description:
        "Phase 2 Job Management E2E test job.",
      requirements: [
        "고객 응대 경험",
      ],
      preferredQualifications: [
        "리셉션 경험",
      ],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "DRAFT",
    }
  );

  console.log(
    "CREATE_STATUS:",
    createResult.status
  );

  console.log(
    "CREATE_BODY:",
    createResult.body
  );

  const created =
    createResult.parsed?.data;

  if (
    createResult.status !== 201 ||
    !createResult.parsed?.success ||
    !created?.jobId
  ) {
    throw new Error(
      "JOB_CREATE_FAILED"
    );
  }

  createdJobId = created.jobId;

  await db
    .collection("jobs")
    .doc(createdJobId)
    .update({
      isTestData: true,
    });

  console.log(
    "CREATED_JOB_ID:",
    createdJobId
  );

  console.log(
    "ORGANIZATION_ID:",
    created.organizationId
  );

  console.log(
    "RECRUITER_ID:",
    created.recruiterId
  );

  console.log(
    "STATUS:",
    created.status
  );

  if (
    created.organizationId !== "jnc" ||
    created.recruiterId !== recruiterUid ||
    created.status !== "DRAFT"
  ) {
    throw new Error(
      "JOB_SERVER_OWNED_FIELDS_INVALID"
    );
  }

  console.log(
    "STEP_3: VERIFY_FIRESTORE_JOB"
  );

  const jobSnapshot = await db
    .collection("jobs")
    .doc(createdJobId)
    .get();

  if (!jobSnapshot.exists) {
    throw new Error(
      "JOB_DOCUMENT_NOT_FOUND"
    );
  }

  const job = jobSnapshot.data();

  if (
    job?.organizationId !== "jnc" ||
    job?.recruiterId !== recruiterUid ||
    job?.title !== marker
  ) {
    throw new Error(
      "JOB_DOCUMENT_INVALID"
    );
  }

  console.log(
    "STEP_4: OPEN_JOB"
  );

  const updateResult = await callApi(
    recruiterToken,
    "/api/b2b/jobs/" +
      encodeURIComponent(createdJobId),
    "PATCH",
    {
      status: "OPEN",
    }
  );

  console.log(
    "UPDATE_STATUS:",
    updateResult.status
  );

  console.log(
    "UPDATE_BODY:",
    updateResult.body
  );

  if (
    updateResult.status !== 200 ||
    !updateResult.parsed?.success ||
    updateResult.parsed?.data?.status !== "OPEN"
  ) {
    throw new Error(
      "JOB_STATUS_UPDATE_FAILED"
    );
  }

  console.log(
    "STEP_5: ORGANIZATION_SPOOF_BLOCKED"
  );

  const spoofResult = await callApi(
    recruiterToken,
    "/api/b2b/jobs",
    "POST",
    {
      organizationId: "attacker-org",
      company: "Spoof Company",
      title: "Spoof Job",
      description: "Spoof",
      requirements: [],
      preferredQualifications: [],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "DRAFT",
    }
  );

  console.log(
    "SPOOF_STATUS:",
    spoofResult.status
  );

  console.log(
    "SPOOF_BODY:",
    spoofResult.body
  );

  if (
    spoofResult.status !== 400 ||
    spoofResult.parsed?.code !==
      "FORBIDDEN_ORGANIZATION_OVERRIDE"
  ) {
    throw new Error(
      "JOB_ORGANIZATION_SPOOF_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_6: B2C_CANDIDATE_B2B_JOBS_DENIED"
  );

  const candidateToken =
    await exchangeCustomToken(
      candidateUid
    );

  const candidateResult = await callApi(
    candidateToken,
    "/api/b2b/jobs",
    "GET"
  );

  console.log(
    "CANDIDATE_STATUS:",
    candidateResult.status
  );

  if (candidateResult.status !== 403) {
    throw new Error(
      "B2C_JOB_MANAGEMENT_ACCESS_NOT_BLOCKED"
    );
  }

  console.log(
    "JOB_MANAGEMENT_E2E_FINISHED"
  );
}

run()
  .then(async () => {
    await cleanup();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(
      "TEST_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );

    await cleanup();
    process.exit(1);
  });
