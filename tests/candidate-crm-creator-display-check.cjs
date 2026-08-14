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

let createdCandidateId = null;

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
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const body =
    await response.json();

  if (
    !response.ok ||
    !body.idToken
  ) {
    throw new Error(
      "ID_TOKEN_EXCHANGE_FAILED"
    );
  }

  return body.idToken;
}

async function callApi(
  idToken,
  path
) {
  const response = await fetch(
    "http://localhost:3000" + path,
    {
      headers: {
        Authorization:
          "Bearer " + idToken,
      },
    }
  );

  const text =
    await response.text();

  let parsed = null;

  try {
    parsed =
      JSON.parse(text);
  } catch {
    // Keep raw body for diagnostics.
  }

  return {
    status:
      response.status,
    body:
      text,
    parsed,
  };
}

async function createCandidate(
  idToken,
  marker
) {
  const response = await fetch(
    "http://localhost:3000/api/b2b/candidates",
    {
      method: "POST",
      headers: {
        Authorization:
          "Bearer " + idToken,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        name:
          "Phase4 Creator Display Candidate",
        phone:
          "010-6600-" +
          String(marker).slice(-4),
        email:
          `phase4.creator.${marker}@example.com`,
        headline:
          "등록자 표시 테스트 후보자",
        careerSummary:
          "등록자 이름 표시 E2E",
        skills: [
          "고객응대",
        ],
      }),
    }
  );

  const text =
    await response.text();

  let parsed = null;

  try {
    parsed =
      JSON.parse(text);
  } catch {
    // Diagnostics only.
  }

  return {
    status:
      response.status,
    body:
      text,
    parsed,
  };
}

async function cleanup() {
  if (!createdCandidateId) {
    return;
  }

  try {
    const events = await db
      .collection("candidateEvents")
      .where(
        "candidateId",
        "==",
        createdCandidateId
      )
      .get();

    if (!events.empty) {
      const batch =
        db.batch();

      for (
        const document of events.docs
      ) {
        batch.delete(
          document.ref
        );
      }

      await batch.commit();
    }

    await db
      .collection("profile")
      .doc(createdCandidateId)
      .delete();

    await db
      .collection("candidates")
      .doc(createdCandidateId)
      .delete();

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
  const marker =
    Date.now();

  console.log(
    "STEP_1: READ_CREATOR_FIXTURE"
  );

  const recruiterSnapshot =
    await db
      .collection("users")
      .doc(recruiterUid)
      .get();

  const recruiterData =
    recruiterSnapshot.data();

  const expectedCreatorName =
    typeof recruiterData?.name ===
      "string"
      ? recruiterData.name.trim()
      : "";

  console.log(
    "CREATOR_FIXTURE_EXISTS:",
    recruiterSnapshot.exists
  );

  console.log(
    "EXPECTED_CREATOR_NAME:",
    expectedCreatorName
  );

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
    "STEP_2: CREATE_CANDIDATE"
  );

  const createResult =
    await createCandidate(
      recruiterToken,
      marker
    );

  console.log(
    "CREATE_STATUS:",
    createResult.status
  );

  if (
    createResult.status !== 201 ||
    !createResult.parsed?.success ||
    !createResult.parsed
      ?.data?.candidateId
  ) {
    console.log(
      "CREATE_BODY:",
      createResult.body
    );

    throw new Error(
      "CANDIDATE_CREATE_FAILED"
    );
  }

  createdCandidateId =
    createResult.parsed
      .data.candidateId;

  console.log(
    "STEP_3: VERIFY_CREATOR_DISPLAY_NAME"
  );

  const detailResult =
    await callApi(
      recruiterToken,
      `/api/b2b/candidates/${encodeURIComponent(
        createdCandidateId
      )}`
    );

  console.log(
    "DETAIL_STATUS:",
    detailResult.status
  );

  console.log(
    "CREATED_BY:",
    detailResult.parsed
      ?.data?.createdBy
  );

  console.log(
    "CREATED_BY_NAME:",
    detailResult.parsed
      ?.data?.createdByName
  );

  if (
    detailResult.status !== 200 ||
    !detailResult.parsed?.success ||
    detailResult.parsed
      ?.data?.createdBy !==
      recruiterUid ||
    detailResult.parsed
      ?.data?.createdByName !==
      expectedCreatorName
  ) {
    throw new Error(
      "CREATOR_DISPLAY_NAME_INVALID"
    );
  }

  console.log(
    "STEP_4: VERIFY_MISSING_CREATOR_FALLBACK"
  );

  const missingCreatorUid =
    `e2e-missing-creator-${marker}`;

  await db
    .collection("candidates")
    .doc(createdCandidateId)
    .update({
      createdBy:
        missingCreatorUid,
    });

  const fallbackResult =
    await callApi(
      recruiterToken,
      `/api/b2b/candidates/${encodeURIComponent(
        createdCandidateId
      )}`
    );

  console.log(
    "FALLBACK_STATUS:",
    fallbackResult.status
  );

  console.log(
    "FALLBACK_CREATED_BY:",
    fallbackResult.parsed
      ?.data?.createdBy
  );

  console.log(
    "FALLBACK_CREATED_BY_NAME:",
    fallbackResult.parsed
      ?.data?.createdByName
  );

  if (
    fallbackResult.status !== 200 ||
    !fallbackResult.parsed?.success ||
    fallbackResult.parsed
      ?.data?.createdBy !==
      missingCreatorUid ||
    fallbackResult.parsed
      ?.data?.createdByName !== null
  ) {
    throw new Error(
      "MISSING_CREATOR_FALLBACK_INVALID"
    );
  }

  console.log(
    "CANDIDATE_CRM_CREATOR_DISPLAY_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "CANDIDATE_CRM_CREATOR_DISPLAY_E2E_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });