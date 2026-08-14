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
  Timestamp,
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
const baseUrl =
  process.env.E2E_BASE_URL ||
  "http://localhost:3000";

const suffix =
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const adminUid =
  `e2e-phase9-admin-${suffix}`;
const recruiterUid =
  `e2e-phase9-recruiter-${suffix}`;
const adminEmail =
  `${adminUid}@example.com`;
const recruiterEmail =
  `${recruiterUid}@example.com`;
const organizationA =
  `e2e-phase9-org-a-${suffix}`;
const organizationB =
  `e2e-phase9-org-b-${suffix}`;

const applicationIds = [
  `e2e-phase9-app-a1-${suffix}`,
  `e2e-phase9-app-a2-${suffix}`,
  `e2e-phase9-app-a3-${suffix}`,
  `e2e-phase9-app-b1-${suffix}`,
];

async function createAuthUser(
  uid,
  email,
  displayName
) {
  await auth.createUser({
    uid,
    email,
    displayName,
    emailVerified: true,
  });
}

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
      `ID_TOKEN_EXCHANGE_FAILED: ${response.status}`
    );
  }

  return body.idToken;
}

async function callApi(
  path,
  idToken
) {
  const response = await fetch(
    `${baseUrl}${path}`,
    {
      method: "GET",
      headers: idToken
        ? {
            Authorization:
              `Bearer ${idToken}`,
          }
        : {},
      cache: "no-store",
    }
  );

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    // Keep raw body for diagnostics.
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

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

function applicationDocument({
  applicationId,
  organizationId,
  recruiterId,
  stage,
  source,
  appliedAt,
  hiringOutcome,
}) {
  return {
    applicationId,
    candidateId:
      `candidate-${applicationId}`,
    jobId:
      `job-${applicationId}`,
    organizationId,
    recruiterId,
    stage,
    source,
    candidateSnapshot: {
      name: `Candidate ${applicationId}`,
      phone: "010-9000-0000",
      email: `${applicationId}@example.com`,
    },
    jobSnapshot: {
      title: `Job ${applicationId}`,
      company: `Company ${organizationId}`,
    },
    ...(hiringOutcome
      ? { hiringOutcome }
      : {}),
    appliedAt:
      Timestamp.fromMillis(appliedAt),
    updatedAt:
      Timestamp.fromMillis(appliedAt),
    lastActivityAt:
      Timestamp.fromMillis(appliedAt),
  };
}

async function bootstrap() {
  await Promise.all([
    createAuthUser(
      adminUid,
      adminEmail,
      "Phase9 E2E Admin"
    ),
    createAuthUser(
      recruiterUid,
      recruiterEmail,
      "Phase9 E2E Recruiter"
    ),
  ]);

  const now = Date.now();
  const batch = db.batch();

  batch.set(
    db.collection("users").doc(adminUid),
    {
      uid: adminUid,
      email: adminEmail,
      name: "Phase9 E2E Admin",
      role: "ADMIN",
      organizationId: null,
      status: "ACTIVE",
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
    }
  );

  batch.set(
    db.collection("users").doc(recruiterUid),
    {
      uid: recruiterUid,
      email: recruiterEmail,
      name: "Phase9 E2E Recruiter",
      role: "RECRUITER",
      organizationId: organizationA,
      status: "ACTIVE",
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
    }
  );

  batch.set(
    db.collection("applications").doc(applicationIds[0]),
    applicationDocument({
      applicationId: applicationIds[0],
      organizationId: organizationA,
      recruiterId: recruiterUid,
      stage: "NEW",
      source: "B2C_WEB",
      appliedAt: now - 60 * 60 * 1000,
    })
  );

  batch.set(
    db.collection("applications").doc(applicationIds[1]),
    applicationDocument({
      applicationId: applicationIds[1],
      organizationId: organizationA,
      recruiterId: recruiterUid,
      stage: "INTERVIEW",
      source: "B2B_DIRECT",
      appliedAt: now - 2 * 60 * 60 * 1000,
    })
  );

  batch.set(
    db.collection("applications").doc(applicationIds[2]),
    applicationDocument({
      applicationId: applicationIds[2],
      organizationId: organizationA,
      recruiterId: recruiterUid,
      stage: "HIRED",
      source: "HEADHUNTING",
      appliedAt: now - 3 * 60 * 60 * 1000,
      hiringOutcome: {
        status: "HIRED",
        decidedAt:
          Timestamp.fromMillis(
            now - 30 * 60 * 1000
          ),
        decidedBy: adminUid,
        note: "Phase9 analytics fixture",
        plannedStartDate: "2026-08-20",
      },
    })
  );

  batch.set(
    db.collection("applications").doc(applicationIds[3]),
    applicationDocument({
      applicationId: applicationIds[3],
      organizationId: organizationB,
      recruiterId: `other-${suffix}`,
      stage: "NEW",
      source: "REFERRAL",
      appliedAt: now - 4 * 60 * 60 * 1000,
    })
  );

  await batch.commit();
}

async function cleanup() {
  const batch = db.batch();

  for (const applicationId of applicationIds) {
    batch.delete(
      db.collection("applications").doc(applicationId)
    );
  }

  batch.delete(
    db.collection("users").doc(adminUid)
  );
  batch.delete(
    db.collection("users").doc(recruiterUid)
  );

  try {
    await batch.commit();
  } catch (error) {
    console.error(
      "FIRESTORE_CLEANUP_FAILED:",
      error
    );
  }

  for (const uid of [adminUid, recruiterUid]) {
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        console.error(
          "AUTH_CLEANUP_FAILED:",
          uid,
          error
        );
      }
    }
  }
}

async function main() {
  console.log(
    "STEP_1: BOOTSTRAP_PHASE9_FIXTURES"
  );
  await bootstrap();

  const unauthenticated =
    await callApi(
      "/api/b2b/analytics?days=30",
      null
    );

  assert(
    unauthenticated.status === 401,
    "UNAUTHENTICATED_ANALYTICS_MUST_BE_401",
    `${unauthenticated.status} ${unauthenticated.body}`
  );

  const [adminToken, recruiterToken] =
    await Promise.all([
      exchangeCustomToken(adminUid),
      exchangeCustomToken(recruiterUid),
    ]);

  console.log(
    "STEP_2: RECRUITER_ANALYTICS_TENANT_SCOPE"
  );

  const recruiterAnalytics =
    await callApi(
      "/api/b2b/analytics?days=30",
      recruiterToken
    );

  assert(
    recruiterAnalytics.status === 200 &&
      recruiterAnalytics.parsed?.success === true,
    "RECRUITER_ANALYTICS_FAILED",
    `${recruiterAnalytics.status} ${recruiterAnalytics.body}`
  );

  const recruiterData =
    recruiterAnalytics.parsed.data;

  assert(
    recruiterData.organizationId === organizationA &&
      recruiterData.totalApplications === 3 &&
      recruiterData.hired === 1 &&
      recruiterData.interviewOrLater === 2,
    "RECRUITER_ANALYTICS_COUNTS_INVALID",
    JSON.stringify(recruiterData)
  );

  const spoofAnalytics =
    await callApi(
      `/api/b2b/analytics?days=30&organizationId=${encodeURIComponent(organizationB)}`,
      recruiterToken
    );

  assert(
    spoofAnalytics.status === 403 &&
      spoofAnalytics.parsed?.code ===
        "ANALYTICS_TENANT_ACCESS_DENIED",
    "RECRUITER_ANALYTICS_TENANT_SPOOF_NOT_BLOCKED",
    `${spoofAnalytics.status} ${spoofAnalytics.body}`
  );

  console.log(
    "STEP_3: ADMIN_ORGANIZATION_FILTER"
  );

  const adminAnalytics =
    await callApi(
      `/api/b2b/analytics?days=30&organizationId=${encodeURIComponent(organizationA)}`,
      adminToken
    );

  assert(
    adminAnalytics.status === 200 &&
      adminAnalytics.parsed?.data?.totalApplications === 3,
    "ADMIN_ANALYTICS_ORGANIZATION_FILTER_FAILED",
    `${adminAnalytics.status} ${adminAnalytics.body}`
  );

  console.log(
    "STEP_4: CURSOR_APPLICATION_PAGINATION"
  );

  const firstPage =
    await callApi(
      "/api/b2b/applications/page?limit=2",
      recruiterToken
    );

  assert(
    firstPage.status === 200 &&
      firstPage.parsed?.success === true &&
      firstPage.parsed.data.items.length === 2 &&
      firstPage.parsed.data.hasMore === true &&
      typeof firstPage.parsed.data.nextCursor === "string",
    "FIRST_APPLICATION_PAGE_INVALID",
    `${firstPage.status} ${firstPage.body}`
  );

  assert(
    firstPage.parsed.data.items.every(
      (item) =>
        item.organizationId === organizationA
    ),
    "APPLICATION_PAGE_TENANT_LEAK_DETECTED"
  );

  const secondPage =
    await callApi(
      `/api/b2b/applications/page?limit=2&cursor=${encodeURIComponent(firstPage.parsed.data.nextCursor)}`,
      recruiterToken
    );

  assert(
    secondPage.status === 200 &&
      secondPage.parsed?.data?.items?.length === 1 &&
      secondPage.parsed.data.hasMore === false,
    "SECOND_APPLICATION_PAGE_INVALID",
    `${secondPage.status} ${secondPage.body}`
  );

  const pagedIds = new Set([
    ...firstPage.parsed.data.items,
    ...secondPage.parsed.data.items,
  ].map((item) => item.applicationId));

  assert(
    applicationIds.slice(0, 3).every(
      (applicationId) =>
        pagedIds.has(applicationId)
    ) &&
      !pagedIds.has(applicationIds[3]),
    "CURSOR_PAGINATION_RESULT_SET_INVALID"
  );

  console.log(
    "STEP_5: CROSS_TENANT_CURSOR_BLOCKED"
  );

  const foreignCursor = Buffer
    .from(applicationIds[3], "utf8")
    .toString("base64url");

  const foreignCursorResponse =
    await callApi(
      `/api/b2b/applications/page?limit=2&cursor=${encodeURIComponent(foreignCursor)}`,
      recruiterToken
    );

  assert(
    foreignCursorResponse.status === 403 &&
      foreignCursorResponse.parsed?.code ===
        "APPLICATION_CURSOR_TENANT_DENIED",
    "CROSS_TENANT_CURSOR_NOT_BLOCKED",
    `${foreignCursorResponse.status} ${foreignCursorResponse.body}`
  );

  console.log(
    "PHASE9_ANALYTICS_PERFORMANCE_E2E_PASSED"
  );
}

main()
  .then(async () => {
    await cleanup();
    console.log("CLEANUP_FINISHED");
  })
  .catch(async (error) => {
    console.error(
      "PHASE9_ANALYTICS_PERFORMANCE_E2E_FAILED:",
      error
    );
    await cleanup();
    process.exit(1);
  });
