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
  FieldValue,
} = require("firebase-admin/firestore");

// ============================================================================
// Firebase Admin
// ============================================================================

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS_NOT_SET"
  );
}

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      serviceAccountPath,
      "utf8"
    )
  );

initializeApp({
  credential:
    cert(serviceAccount),

  projectId:
    "the-lobby-platform",
});

const db =
  getFirestore();

const auth =
  getAuth();

// ============================================================================
// Existing E2E Data
// ============================================================================

const candidateUid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";

const applicationId =
  "xnHT4sEYN2wFjOZIEIcP__hansung-yuseong-reception-20260813";

// ============================================================================
// Cross-Tenant Test User
// ============================================================================

const otherOrgId =
  "e2e-other-org";

const otherRecruiterUid =
  "e2e-recruiter-other-org";

const otherRecruiterEmail =
  "e2e.recruiter.other@example.com";

// ============================================================================
// Helpers
// ============================================================================

async function exchangeCustomToken(
  uid
) {
  const apiKey =
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND"
    );
  }

  const customToken =
    await auth.createCustomToken(
      uid
    );

  const response =
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

async function callStageApi(
  idToken,
  stage
) {
  const response =
    await fetch(
      "http://localhost:3000/api/applications/" +
        encodeURIComponent(
          applicationId
        ) +
        "/stage",
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            "Bearer " +
            idToken,
        },

        body:
          JSON.stringify({
            stage,
          }),
      }
    );

  return {
    status:
      response.status,

    body:
      await response.text(),
  };
}

// ============================================================================
// Bootstrap Other Tenant
// ============================================================================

async function bootstrapOtherTenant() {
  const organizationReference =
    db
      .collection(
        "organizations"
      )
      .doc(
        otherOrgId
      );

  const organizationSnapshot =
    await organizationReference.get();

  if (
    !organizationSnapshot.exists
  ) {
    await organizationReference.set({
      organizationId:
        otherOrgId,

      name:
        "E2E Other Organization",

      status:
        "ACTIVE",

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    });
  }

  try {
    await auth.getUser(
      otherRecruiterUid
    );
  } catch (error) {
    if (
      error?.code ===
      "auth/user-not-found"
    ) {
      await auth.createUser({
        uid:
          otherRecruiterUid,

        email:
          otherRecruiterEmail,

        emailVerified:
          true,

        disabled:
          false,
      });
    } else {
      throw error;
    }
  }

  const userReference =
    db
      .collection(
        "users"
      )
      .doc(
        otherRecruiterUid
      );

  const userSnapshot =
    await userReference.get();

  if (
    !userSnapshot.exists
  ) {
    await userReference.set({
      uid:
        otherRecruiterUid,

      email:
        otherRecruiterEmail,

      name:
        "E2E Other Recruiter",

      role:
        "RECRUITER",

      organizationId:
        otherOrgId,

      status:
        "ACTIVE",

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    });
  }
}

// ============================================================================
// Verification
// ============================================================================

async function verifyDatabaseState() {
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
    "FINAL_STAGE:",
    applicationSnapshot.data()?.stage
  );

  console.log(
    "FINAL_EVENT_COUNT:",
    eventSnapshots.size
  );

  const stageEvents =
    eventSnapshots.docs
      .map(
        (
          document
        ) =>
          document.data()
      )
      .filter(
        (
          event
        ) =>
          event.type ===
          "STAGE_CHANGED"
      );

  console.log(
    "STAGE_CHANGED_EVENT_COUNT:",
    stageEvents.length
  );
}

// ============================================================================
// Run
// ============================================================================

async function run() {
  console.log(
    "STEP_1: CANDIDATE_STAGE_ATTACK"
  );

  const candidateToken =
    await exchangeCustomToken(
      candidateUid
    );

  const candidateResult =
    await callStageApi(
      candidateToken,
      "INTERVIEW"
    );

  console.log(
    "CANDIDATE_STAGE_STATUS:",
    candidateResult.status
  );

  console.log(
    "CANDIDATE_STAGE_BODY:",
    candidateResult.body
  );

  console.log(
    "STEP_2: BOOTSTRAP_OTHER_TENANT"
  );

  await bootstrapOtherTenant();

  console.log(
    "OTHER_TENANT_READY: true"
  );

  console.log(
    "STEP_3: CROSS_TENANT_STAGE_ATTACK"
  );

  const recruiterToken =
    await exchangeCustomToken(
      otherRecruiterUid
    );

  const recruiterResult =
    await callStageApi(
      recruiterToken,
      "INTERVIEW"
    );

  console.log(
    "CROSS_TENANT_STAGE_STATUS:",
    recruiterResult.status
  );

  console.log(
    "CROSS_TENANT_STAGE_BODY:",
    recruiterResult.body
  );

  console.log(
    "STEP_4: VERIFY_UNCHANGED_DATABASE"
  );

  await verifyDatabaseState();

  console.log(
    "AUTHORIZATION_STAGE_CHECK_FINISHED"
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