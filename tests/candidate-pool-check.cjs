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
let otherTenantCandidateId = null;

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
  method = "GET",
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

    for (const candidateId of [
      createdCandidateId,
      otherTenantCandidateId,
    ]) {
      if (!candidateId) {
        continue;
      }

      batch.delete(
        db
          .collection("profile")
          .doc(candidateId)
      );

      batch.delete(
        db
          .collection("candidates")
          .doc(candidateId)
      );
    }

    await batch.commit();

    console.log(
      "CLEANUP_FINISHED"
    );
  } catch (error) {
    console.error(
      "CLEANUP_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );
  }
}

async function run() {
  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );

  console.log(
    "STEP_1: CREATE_OWN_TENANT_CANDIDATE"
  );

  const marker = Date.now();

  const createResult = await callApi(
    recruiterToken,
    "/api/b2b/candidates",
    "POST",
    {
      name: "Phase3 Pool Candidate",
      phone:
        "010-7777-" +
        String(marker).slice(-4),
      email:
        `phase3.pool.${marker}@example.com`,
      headline:
        "프론트데스크 운영 경력자",
      careerSummary:
        "Phase 3 Candidate Pool E2E candidate.",
      skills: [
        "고객응대",
        "리셉션",
      ],
    }
  );

  console.log(
    "CREATE_STATUS:",
    createResult.status
  );

  if (
    createResult.status !== 201 ||
    !createResult.parsed?.success ||
    !createResult.parsed?.data?.candidateId
  ) {
    throw new Error(
      "CANDIDATE_CREATE_FAILED"
    );
  }

  createdCandidateId =
    createResult.parsed.data.candidateId;

  const createdSnapshot = await db
    .collection("candidates")
    .doc(createdCandidateId)
    .get();

  const createdData =
    createdSnapshot.data();

  console.log(
    "CREATED_ORGANIZATION_ID:",
    createdData?.organizationId
  );

  console.log(
    "CREATED_BY:",
    createdData?.createdBy
  );

  if (
    createdData?.organizationId !== "jnc" ||
    createdData?.createdBy !== recruiterUid
  ) {
    throw new Error(
      "CANDIDATE_PROVENANCE_FAILED"
    );
  }

  console.log(
    "STEP_2: SEED_OTHER_TENANT_CANDIDATE"
  );

  otherTenantCandidateId =
    db.collection("candidates").doc().id;

  await db
    .collection("candidates")
    .doc(otherTenantCandidateId)
    .set({
      candidateId:
        otherTenantCandidateId,
      authUid: null,
      name:
        "Other Tenant Candidate",
      phone:
        "010-0000-0000",
      email:
        `phase3.other.${marker}@example.com`,
      source:
        "B2B_DIRECT",
      accountStatus:
        "ACTIVE",
      organizationId:
        "e2e-other-org",
      createdBy:
        "e2e-other-recruiter",
      createdAt:
        new Date(),
      updatedAt:
        new Date(),
    });

  await db
    .collection("profile")
    .doc(otherTenantCandidateId)
    .set({
      candidateId:
        otherTenantCandidateId,
      headline:
        "다른 조직 후보자",
      careerSummary: "",
      skills: ["기밀"],
      careers: [],
      education: [],
      profileCompleteness: 40,
      updatedAt:
        new Date(),
    });

  console.log(
    "STEP_3: OWN_TENANT_POOL_LIST"
  );

  const listResult = await callApi(
    recruiterToken,
    "/api/b2b/candidates?organizationId=jnc"
  );

  console.log(
    "LIST_STATUS:",
    listResult.status
  );

  const list =
    listResult.parsed?.data;

  const ownVisible =
    Array.isArray(list) &&
    list.some(
      (item) =>
        item.candidateId ===
          createdCandidateId &&
        item.organizationId === "jnc" &&
        item.headline ===
          "프론트데스크 운영 경력자" &&
        Array.isArray(item.skills) &&
        item.skills.includes("리셉션")
    );

  const otherHidden =
    Array.isArray(list) &&
    !list.some(
      (item) =>
        item.candidateId ===
        otherTenantCandidateId
    );

  console.log(
    "OWN_CANDIDATE_VISIBLE:",
    ownVisible
  );

  console.log(
    "OTHER_TENANT_CANDIDATE_HIDDEN:",
    otherHidden
  );

  if (
    listResult.status !== 200 ||
    !listResult.parsed?.success ||
    !ownVisible ||
    !otherHidden
  ) {
    throw new Error(
      "TENANT_POOL_LIST_FAILED"
    );
  }

  console.log(
    "STEP_4: CROSS_TENANT_POOL_QUERY_BLOCKED"
  );

  const crossTenantResult = await callApi(
    recruiterToken,
    "/api/b2b/candidates?organizationId=e2e-other-org"
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
      "CROSS_TENANT_POOL_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_5: B2C_POOL_ACCESS_DENIED"
  );

  const candidateToken =
    await exchangeCustomToken(
      candidateUid
    );

  const b2cResult = await callApi(
    candidateToken,
    "/api/b2b/candidates?organizationId=jnc"
  );

  console.log(
    "B2C_STATUS:",
    b2cResult.status
  );

  console.log(
    "B2C_BODY:",
    b2cResult.body
  );

  if (b2cResult.status !== 403) {
    throw new Error(
      "B2C_POOL_ACCESS_NOT_BLOCKED"
    );
  }

  console.log(
    "CANDIDATE_POOL_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "CANDIDATE_POOL_E2E_FAILED:",
      error instanceof Error
        ? error.stack || error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(cleanup);
