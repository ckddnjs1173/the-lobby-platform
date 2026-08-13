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

// ============================================================================
// Configuration
// ============================================================================

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS_NOT_SET"
  );
}

if (
  !fs.existsSync(
    serviceAccountPath
  )
) {
  throw new Error(
    "SERVICE_ACCOUNT_FILE_NOT_FOUND"
  );
}

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      serviceAccountPath,
      "utf8"
    )
  );

// ============================================================================
// Firebase Admin
// ============================================================================

initializeApp({
  credential:
    cert(
      serviceAccount
    ),

  projectId:
    "the-lobby-platform",
});

// ============================================================================
// Test Data
// ============================================================================

const uid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";

const candidateId =
  "xnHT4sEYN2wFjOZIEIcP";

const jobId =
  "hansung-yuseong-reception-20260813";

const applicationId =
  candidateId +
  "__" +
  jobId;

// ============================================================================
// Test
// ============================================================================

async function run() {
  const apiKey =
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND"
    );
  }

  console.log(
    "STEP_1: CREATE_CUSTOM_TOKEN"
  );

  /**
   * cert(serviceAccount)를 사용하므로
   * 서비스 계정 JSON의 private key로
   * 로컬에서 Custom Token을 서명한다.
   *
   * 토큰 값 자체는 출력하지 않는다.
   */
  const customToken =
    await getAuth()
      .createCustomToken(
        uid
      );

  console.log(
    "CUSTOM_TOKEN_CREATED: true"
  );

  console.log(
    "STEP_2: EXCHANGE_ID_TOKEN"
  );

  const tokenResponse =
    await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" +
        encodeURIComponent(
          apiKey
        ),
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            token:
              customToken,

            returnSecureToken:
              true,
          }),
      }
    );

  const tokenResult =
    await tokenResponse.json();

  console.log(
    "TOKEN_EXCHANGE_STATUS:",
    tokenResponse.status
  );

  if (
    !tokenResponse.ok ||
    !tokenResult.idToken
  ) {
    console.log(
      "TOKEN_EXCHANGE_FAILED"
    );

    throw new Error(
      "TOKEN_EXCHANGE_FAILED"
    );
  }

  console.log(
    "ID_TOKEN_RECEIVED: true"
  );

  console.log(
    "STEP_3: SECOND_APPLY_REQUEST"
  );

  const applyResponse =
    await fetch(
      "http://localhost:3000/api/applications/apply",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            "Bearer " +
            tokenResult.idToken,
        },

        body:
          JSON.stringify({
            jobId,
          }),
      }
    );

  const applyBody =
    await applyResponse.text();

  console.log(
    "SECOND_APPLY_STATUS:",
    applyResponse.status
  );

  console.log(
    "SECOND_APPLY_BODY:",
    applyBody
  );

  console.log(
    "STEP_4: VERIFY_DATABASE"
  );

  const db =
    getFirestore();

  const applicationSnapshot =
    await db
      .collection(
        "applications"
      )
      .doc(
        applicationId
      )
      .get();

  const eventSnapshots =
    await db
      .collection(
        "appEvents"
      )
      .where(
        "applicationId",
        "==",
        applicationId
      )
      .get();

  console.log(
    "APPLICATION_EXISTS:",
    applicationSnapshot.exists
  );

  console.log(
    "APPLICATION_ID:",
    applicationSnapshot.id
  );

  console.log(
    "APP_EVENT_COUNT:",
    eventSnapshots.size
  );

  eventSnapshots.forEach(
    (
      document
    ) => {
      const event =
        document.data();

      console.log(
        "EVENT:",
        JSON.stringify({
          eventId:
            document.id,

          type:
            event.type,

          changedBy:
            event.changedBy,

          toStage:
            event.toStage ??
            null,
        })
      );
    }
  );

  console.log(
    "DUPLICATE_APPLY_CHECK_FINISHED"
  );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch(
    (
      error
    ) => {
      console.error(
        "TEST_FAILED:",
        error instanceof Error
          ? error.message
          : error
      );

      process.exit(1);
    }
  );