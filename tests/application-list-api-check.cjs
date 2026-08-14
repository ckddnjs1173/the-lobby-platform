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

const suffix =
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const adminUid =
  `e2e-phase5-admin-${suffix}`;
const recruiterUid =
  `e2e-phase5-recruiter-${suffix}`;

const adminEmail =
  `${adminUid}@example.com`;
const recruiterEmail =
  `${recruiterUid}@example.com`;

const organizationA =
  `e2e-phase5-org-a-${suffix}`;
const organizationB =
  `e2e-phase5-org-b-${suffix}`;

const applicationAId =
  `e2e-phase5-app-a-${suffix}`;
const applicationBId =
  `e2e-phase5-app-b-${suffix}`;

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
      "ID_TOKEN_EXCHANGE_FAILED"
    );
  }

  return body.idToken;
}

async function callListApi(idToken) {
  const response = await fetch(
    "http://localhost:3000/api/b2b/applications",
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
    // Keep raw text for diagnostics.
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

async function bootstrap() {
  await Promise.all([
    createAuthUser(
      adminUid,
      adminEmail,
      "Phase5 E2E Admin"
    ),
    createAuthUser(
      recruiterUid,
      recruiterEmail,
      "Phase5 E2E Recruiter"
    ),
  ]);

  const now = Date.now();

  const batch = db.batch();

  batch.set(
    db.collection("users").doc(adminUid),
    {
      uid: adminUid,
      email: adminEmail,
      name: "Phase5 E2E Admin",
      role: "ADMIN",
      organizationId: null,
      status: "ACTIVE",
      createdAt:
        Timestamp.fromMillis(now),
      updatedAt:
        Timestamp.fromMillis(now),
    }
  );

  batch.set(
    db.collection("users").doc(recruiterUid),
    {
      uid: recruiterUid,
      email: recruiterEmail,
      name: "Phase5 E2E Recruiter",
      role: "RECRUITER",
      organizationId: organizationA,
      status: "ACTIVE",
      createdAt:
        Timestamp.fromMillis(now),
      updatedAt:
        Timestamp.fromMillis(now),
    }
  );

  batch.set(
    db
      .collection("applications")
      .doc(applicationAId),
    {
      applicationId: applicationAId,
      candidateId:
        `candidate-a-${suffix}`,
      jobId:
        `job-a-${suffix}`,
      organizationId: organizationA,
      recruiterId: recruiterUid,
      stage: "NEW",
      source: "B2B_DIRECT",
      candidateSnapshot: {
        name: "Phase5 Candidate A",
        phone: "010-5000-0001",
        email:
          `candidate-a-${suffix}@example.com`,
      },
      jobSnapshot: {
        title: "Phase5 Job A",
        company: "Phase5 Company A",
      },
      appliedAt:
        Timestamp.fromMillis(now - 1000),
      updatedAt:
        Timestamp.fromMillis(now - 1000),
      lastActivityAt:
        Timestamp.fromMillis(now - 1000),
    }
  );

  batch.set(
    db
      .collection("applications")
      .doc(applicationBId),
    {
      applicationId: applicationBId,
      candidateId:
        `candidate-b-${suffix}`,
      jobId:
        `job-b-${suffix}`,
      organizationId: organizationB,
      recruiterId:
        `recruiter-b-${suffix}`,
      stage: "REVIEWING",
      source: "HEADHUNTING",
      candidateSnapshot: {
        name: "Phase5 Candidate B",
        phone: "010-5000-0002",
        email:
          `candidate-b-${suffix}@example.com`,
      },
      jobSnapshot: {
        title: "Phase5 Job B",
        company: "Phase5 Company B",
      },
      appliedAt:
        Timestamp.fromMillis(now - 2000),
      updatedAt:
        Timestamp.fromMillis(now - 2000),
      lastActivityAt:
        Timestamp.fromMillis(now - 2000),
    }
  );

  await batch.commit();
}

async function cleanup() {
  const batch = db.batch();

  batch.delete(
    db
      .collection("applications")
      .doc(applicationAId)
  );

  batch.delete(
    db
      .collection("applications")
      .doc(applicationBId)
  );

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

  for (const uid of [
    adminUid,
    recruiterUid,
  ]) {
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (
        error?.code !==
        "auth/user-not-found"
      ) {
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
  await bootstrap();

  const unauthenticated =
    await callListApi(null);

  assert(
    unauthenticated.status === 401,
    "UNAUTHENTICATED_LIST_MUST_BE_401",
    `${unauthenticated.status} ${unauthenticated.body}`
  );

  const [
    adminToken,
    recruiterToken,
  ] = await Promise.all([
    exchangeCustomToken(adminUid),
    exchangeCustomToken(recruiterUid),
  ]);

  const adminResponse =
    await callListApi(adminToken);

  assert(
    adminResponse.status === 200 &&
      adminResponse.parsed?.success === true &&
      Array.isArray(
        adminResponse.parsed?.data
      ),
    "ADMIN_LIST_FAILED",
    `${adminResponse.status} ${adminResponse.body}`
  );

  const adminIds = new Set(
    adminResponse.parsed.data.map(
      (item) => item.applicationId
    )
  );

  assert(
    adminIds.has(applicationAId) &&
      adminIds.has(applicationBId),
    "ADMIN_MUST_SEE_BOTH_ORGANIZATIONS"
  );

  const adminApplicationA =
    adminResponse.parsed.data.find(
      (item) =>
        item.applicationId ===
        applicationAId
    );

  assert(
    adminApplicationA?.candidateName ===
      "Phase5 Candidate A" &&
      adminApplicationA?.jobTitle ===
        "Phase5 Job A" &&
      typeof adminApplicationA?.appliedAt ===
        "string" &&
      adminApplicationA.appliedAt.length > 0,
    "APPLICATION_VIEW_MAPPING_FAILED",
    JSON.stringify(adminApplicationA)
  );

  const recruiterResponse =
    await callListApi(recruiterToken);

  assert(
    recruiterResponse.status === 200 &&
      recruiterResponse.parsed?.success === true &&
      Array.isArray(
        recruiterResponse.parsed?.data
      ),
    "RECRUITER_LIST_FAILED",
    `${recruiterResponse.status} ${recruiterResponse.body}`
  );

  const recruiterIds = new Set(
    recruiterResponse.parsed.data.map(
      (item) => item.applicationId
    )
  );

  assert(
    recruiterIds.has(applicationAId),
    "RECRUITER_MUST_SEE_SAME_ORG_APPLICATION"
  );

  assert(
    !recruiterIds.has(applicationBId),
    "RECRUITER_MUST_NOT_SEE_OTHER_ORG_APPLICATION"
  );

  assert(
    recruiterResponse.parsed.data.every(
      (item) =>
        item.organizationId ===
        organizationA
    ),
    "RECRUITER_LIST_TENANT_LEAK_DETECTED"
  );

  console.log(
    "UNAUTHENTICATED_STATUS:",
    unauthenticated.status
  );
  console.log(
    "ADMIN_TEST_APPLICATIONS_VISIBLE:",
    adminIds.has(applicationAId) &&
      adminIds.has(applicationBId)
  );
  console.log(
    "RECRUITER_SAME_ORG_VISIBLE:",
    recruiterIds.has(applicationAId)
  );
  console.log(
    "RECRUITER_OTHER_ORG_HIDDEN:",
    !recruiterIds.has(applicationBId)
  );
  console.log(
    "APPLICATION_LIST_API_E2E_FINISHED"
  );
}

main()
  .then(async () => {
    await cleanup();
    console.log("CLEANUP_FINISHED");
  })
  .catch(async (error) => {
    console.error(
      "APPLICATION_LIST_API_E2E_FAILED:",
      error
    );
    await cleanup();
    process.exit(1);
  });
