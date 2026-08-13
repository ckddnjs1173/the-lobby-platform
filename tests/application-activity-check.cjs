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

const applicationId =
  "xnHT4sEYN2wFjOZIEIcP__hansung-yuseong-reception-20260813";

const recruiterUid =
  "e2e-recruiter-jnc";

const candidateUid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";

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

async function callActivityApi(
  idToken,
  method,
  body
) {
  const response = await fetch(
    "http://localhost:3000/api/b2b/applications/" +
      encodeURIComponent(applicationId) +
      "/activity",
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
    // keep raw body for diagnostics
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

async function run() {
  console.log(
    "STEP_1: RECRUITER_ACTIVITY_READ"
  );

  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );

  const before =
    await callActivityApi(
      recruiterToken,
      "GET"
    );

  console.log(
    "READ_STATUS:",
    before.status
  );

  console.log(
    "READ_BODY:",
    before.body
  );

  if (
    before.status !== 200 ||
    !before.parsed?.success ||
    !Array.isArray(
      before.parsed?.data
    )
  ) {
    throw new Error(
      "ACTIVITY_READ_FAILED"
    );
  }

  console.log(
    "STEP_2: RECRUITER_ADD_NOTE"
  );

  const marker =
    "Phase2 activity E2E " +
    Date.now();

  const createResult =
    await callActivityApi(
      recruiterToken,
      "POST",
      {
        note: marker,
      }
    );

  console.log(
    "NOTE_STATUS:",
    createResult.status
  );

  console.log(
    "NOTE_BODY:",
    createResult.body
  );

  const created =
    createResult.parsed?.data;

  if (
    createResult.status !== 201 ||
    !createResult.parsed?.success ||
    created?.type !==
      "NOTE_ADDED" ||
    created?.changedBy !==
      recruiterUid ||
    created?.note !== marker
  ) {
    throw new Error(
      "ACTIVITY_NOTE_CREATE_FAILED"
    );
  }

  console.log(
    "STEP_3: VERIFY_FIRESTORE_EVENT"
  );

  const eventSnapshot =
    await db
      .collection("appEvents")
      .doc(created.eventId)
      .get();

  if (!eventSnapshot.exists) {
    throw new Error(
      "ACTIVITY_EVENT_NOT_FOUND"
    );
  }

  const event =
    eventSnapshot.data();

  console.log(
    "EVENT_TYPE:",
    event?.type
  );

  console.log(
    "EVENT_ORGANIZATION_ID:",
    event?.organizationId
  );

  console.log(
    "EVENT_CHANGED_BY:",
    event?.changedBy
  );

  console.log(
    "EVENT_NOTE_MATCH:",
    event?.note === marker
  );

  if (
    event?.type !== "NOTE_ADDED" ||
    event?.organizationId !== "jnc" ||
    event?.changedBy !== recruiterUid ||
    event?.note !== marker
  ) {
    throw new Error(
      "ACTIVITY_EVENT_DATA_INVALID"
    );
  }

  console.log(
    "STEP_4: VERIFY_ACTIVITY_READBACK"
  );

  const after =
    await callActivityApi(
      recruiterToken,
      "GET"
    );

  const found =
    Array.isArray(after.parsed?.data) &&
    after.parsed.data.some(
      (item) =>
        item.eventId ===
          created.eventId &&
        item.note === marker
    );

  console.log(
    "READBACK_STATUS:",
    after.status
  );

  console.log(
    "CREATED_EVENT_IN_TIMELINE:",
    found
  );

  if (
    after.status !== 200 ||
    !found
  ) {
    throw new Error(
      "ACTIVITY_READBACK_FAILED"
    );
  }

  console.log(
    "STEP_5: B2C_CANDIDATE_ACCESS_DENIED"
  );

  const candidateToken =
    await exchangeCustomToken(
      candidateUid
    );

  const candidateRead =
    await callActivityApi(
      candidateToken,
      "GET"
    );

  console.log(
    "CANDIDATE_READ_STATUS:",
    candidateRead.status
  );

  console.log(
    "CANDIDATE_READ_BODY:",
    candidateRead.body
  );

  if (candidateRead.status !== 403) {
    throw new Error(
      "B2C_ACTIVITY_ACCESS_NOT_BLOCKED"
    );
  }

  console.log(
    "APPLICATION_ACTIVITY_E2E_FINISHED"
  );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "TEST_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  });
