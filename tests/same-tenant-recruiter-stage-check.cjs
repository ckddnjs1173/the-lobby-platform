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
// Test Data
// ============================================================================

const organizationId =
  "jnc";

const recruiterUid =
  "e2e-recruiter-jnc";

const recruiterEmail =
  "e2e.recruiter.jnc@example.com";

const applicationId =
  "xnHT4sEYN2wFjOZIEIcP__hansung-yuseong-reception-20260813";

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

async function bootstrapRecruiter() {
  try {
    await auth.getUser(
      recruiterUid
    );
  } catch (error) {
    if (
      error?.code ===
      "auth/user-not-found"
    ) {
      await auth.createUser({
        uid:
          recruiterUid,

        email:
          recruiterEmail,

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
        recruiterUid
      );

  const userSnapshot =
    await userReference.get();

  if (
    !userSnapshot.exists
  ) {
    await userReference.set({
      uid:
        recruiterUid,

      email:
        recruiterEmail,

      name:
        "E2E J&C Recruiter",

      role:
        "RECRUITER",

      organizationId,

      status:
        "ACTIVE",

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    });
  }
}

async function changeStage(
  idToken
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
            stage:
              "CONTACTED",

            note:
              "Phase 1 E2E 동일 조직 Recruiter 권한 검증",
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
// Run
// ============================================================================

async function run() {
  console.log(
    "STEP_1: BOOTSTRAP_SAME_TENANT_RECRUITER"
  );

  await bootstrapRecruiter();

  console.log(
    "RECRUITER_READY: true"
  );

  console.log(
    "STEP_2: CREATE_RECRUITER_ID_TOKEN"
  );

  const idToken =
    await exchangeCustomToken(
      recruiterUid
    );

  console.log(
    "RECRUITER_ID_TOKEN_READY: true"
  );

  console.log(
    "STEP_3: CHANGE_STAGE"
  );

  const result =
    await changeStage(
      idToken
    );

  console.log(
    "STAGE_API_STATUS:",
    result.status
  );

  console.log(
    "STAGE_API_BODY:",
    result.body
  );

  console.log(
    "STEP_4: VERIFY_DATABASE"
  );

  const applicationSnapshot =
    await db
      .collection(
        "applications"
      )
      .doc(
        applicationId
      )
      .get();

  const application =
    applicationSnapshot.data();

  console.log(
    "FINAL_STAGE:",
    application?.stage
  );

  console.log(
    "ORGANIZATION_ID:",
    application?.organizationId
  );

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
    "APP_EVENT_COUNT:",
    eventSnapshots.size
  );

  const events =
    eventSnapshots.docs
      .map((document) => ({
        eventId:
          document.id,

        ...document.data(),
      }))
      .sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() ??
          0;

        const bTime =
          b.createdAt?.toMillis?.() ??
          0;

        return aTime - bTime;
      });

  for (
    const event of events
  ) {
    console.log(
      "EVENT:",
      JSON.stringify({
        eventId:
          event.eventId,

        type:
          event.type,

        fromStage:
          event.fromStage ??
          null,

        toStage:
          event.toStage ??
          null,

        changedBy:
          event.changedBy,

        organizationId:
          event.organizationId ??
          null,

        note:
          event.note ??
          null,

        changedByIsRecruiter:
          event.changedBy ===
          recruiterUid,
      })
    );
  }

  console.log(
    "SAME_TENANT_RECRUITER_CHECK_FINISHED"
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