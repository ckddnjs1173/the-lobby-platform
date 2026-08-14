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

const recruiterUid =
  "e2e-recruiter-jnc";

const createdCandidateIds = [];

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

async function callApi(idToken, path) {
  const response = await fetch(
    "http://localhost:3000" + path,
    {
      headers: {
        Authorization:
          "Bearer " + idToken,
      },
    }
  );

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    // Keep raw response for diagnostics.
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

async function seedCandidate({
  name,
  email,
  phone,
  updatedAt,
}) {
  const candidateId =
    db.collection("candidates").doc().id;

  createdCandidateIds.push(candidateId);

  const createdAt =
    Timestamp.fromMillis(
      updatedAt.toMillis() - 1000
    );

  const batch = db.batch();

  batch.set(
    db
      .collection("candidates")
      .doc(candidateId),
    {
      candidateId,
      authUid: null,
      name,
      phone,
      email,
      source: "B2B_DIRECT",
      accountStatus: "ACTIVE",
      organizationId: "jnc",
      createdBy: recruiterUid,
      createdAt,
      updatedAt,
    }
  );

  batch.set(
    db
      .collection("profile")
      .doc(candidateId),
    {
      candidateId,
      headline: "Phase 4 pagination fixture",
      careerSummary: "",
      skills: ["pagination"],
      careers: [],
      education: [],
      profileCompleteness: 40,
      updatedAt,
    }
  );

  await batch.commit();

  return candidateId;
}

async function cleanup() {
  if (createdCandidateIds.length === 0) {
    return;
  }

  try {
    const batch = db.batch();

    for (const candidateId of createdCandidateIds) {
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
  console.log(
    "STEP_1: READ_CREATOR_FIXTURE"
  );

  const recruiterSnapshot = await db
    .collection("users")
    .doc(recruiterUid)
    .get();

  const recruiterData =
    recruiterSnapshot.data();

  const expectedCreatorName =
    typeof recruiterData?.name === "string"
      ? recruiterData.name.trim()
      : "";

  if (
    !recruiterSnapshot.exists ||
    !expectedCreatorName
  ) {
    throw new Error(
      "CREATOR_FIXTURE_INVALID"
    );
  }

  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );

  console.log(
    "STEP_2: SEED_TWO_ORDERED_CANDIDATES"
  );

  const baseTime = Date.now() + 10_000;

  const firstCandidateId =
    await seedCandidate({
      name: "Phase4 Pagination First",
      email:
        `phase4.pagination.first.${baseTime}@example.com`,
      phone: "010-8800-0001",
      updatedAt:
        Timestamp.fromMillis(
          baseTime + 1000
        ),
    });

  const secondCandidateId =
    await seedCandidate({
      name: "Phase4 Pagination Second",
      email:
        `phase4.pagination.second.${baseTime}@example.com`,
      phone: "010-8800-0002",
      updatedAt:
        Timestamp.fromMillis(
          baseTime + 2000
        ),
    });

  console.log(
    "STEP_3: VERIFY_FIRST_PAGE"
  );

  const firstPage = await callApi(
    recruiterToken,
    "/api/b2b/candidates?organizationId=jnc&limit=1"
  );

  const firstPageItem =
    firstPage.parsed?.data?.[0];

  const firstPagination =
    firstPage.parsed?.pagination;

  console.log(
    "FIRST_PAGE_STATUS:",
    firstPage.status
  );

  console.log(
    "FIRST_PAGE_CANDIDATE_ID:",
    firstPageItem?.candidateId
  );

  console.log(
    "FIRST_PAGE_HAS_MORE:",
    firstPagination?.hasMore
  );

  if (
    firstPage.status !== 200 ||
    !firstPage.parsed?.success ||
    !Array.isArray(firstPage.parsed?.data) ||
    firstPage.parsed.data.length !== 1 ||
    firstPageItem?.candidateId !==
      secondCandidateId ||
    firstPageItem?.createdByName !==
      expectedCreatorName ||
    firstPagination?.limit !== 1 ||
    typeof firstPagination?.total !== "number" ||
    firstPagination.total < 2 ||
    firstPagination?.hasMore !== true ||
    typeof firstPagination?.nextCursor !== "string" ||
    !firstPagination.nextCursor
  ) {
    console.log(
      "FIRST_PAGE_BODY:",
      firstPage.body
    );

    throw new Error(
      "FIRST_PAGE_PAGINATION_INVALID"
    );
  }

  console.log(
    "STEP_4: VERIFY_CURSOR_PAGE"
  );

  const secondPage = await callApi(
    recruiterToken,
    "/api/b2b/candidates?organizationId=jnc&limit=1&cursor=" +
      encodeURIComponent(
        firstPagination.nextCursor
      )
  );

  const secondPageItem =
    secondPage.parsed?.data?.[0];

  console.log(
    "SECOND_PAGE_STATUS:",
    secondPage.status
  );

  console.log(
    "SECOND_PAGE_CANDIDATE_ID:",
    secondPageItem?.candidateId
  );

  if (
    secondPage.status !== 200 ||
    !secondPage.parsed?.success ||
    !Array.isArray(secondPage.parsed?.data) ||
    secondPage.parsed.data.length !== 1 ||
    secondPageItem?.candidateId !==
      firstCandidateId ||
    secondPageItem?.candidateId ===
      firstPageItem?.candidateId
  ) {
    console.log(
      "SECOND_PAGE_BODY:",
      secondPage.body
    );

    throw new Error(
      "CURSOR_PAGE_INVALID"
    );
  }

  console.log(
    "STEP_5: VERIFY_INVALID_CURSOR"
  );

  const invalidCursor = await callApi(
    recruiterToken,
    "/api/b2b/candidates?organizationId=jnc&cursor=not-a-valid-cursor"
  );

  console.log(
    "INVALID_CURSOR_STATUS:",
    invalidCursor.status
  );

  if (
    invalidCursor.status !== 400 ||
    invalidCursor.parsed?.code !==
      "INVALID_PAGE_CURSOR"
  ) {
    console.log(
      "INVALID_CURSOR_BODY:",
      invalidCursor.body
    );

    throw new Error(
      "INVALID_CURSOR_NOT_REJECTED"
    );
  }

  console.log(
    "CANDIDATE_POOL_PAGINATION_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "CANDIDATE_POOL_PAGINATION_E2E_FAILED:",
      error instanceof Error
        ? error.stack || error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(cleanup);
