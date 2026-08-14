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

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error(
    "NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND"
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

const organizationA =
  `e2e-phase7-org-a-${suffix}`;
const organizationB =
  `e2e-phase7-org-b-${suffix}`;
const recruiterAUid =
  `e2e-phase7-recruiter-a-${suffix}`;
const recruiterBUid =
  `e2e-phase7-recruiter-b-${suffix}`;
const b2cUid =
  `e2e-phase7-b2c-${suffix}`;
const applicationId =
  `e2e-phase7-app-${suffix}`;
const candidateId =
  `e2e-phase7-candidate-${suffix}`;
const candidateEmail =
  `phase7-candidate-${suffix}@example.com`;

const sentRequestId =
  `phase7_sent_${suffix}`;
const failedRequestId =
  `phase7_failed_${suffix}`;
const pendingRequestId =
  `phase7_pending_${suffix}`;

function communicationId(requestId) {
  return `${applicationId}__${requestId}`;
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
  method,
  idToken,
  body
) {
  const response = await fetch(
    `${baseUrl}/api/b2b/applications/${encodeURIComponent(
      applicationId
    )}/communications`,
    {
      method,
      headers: {
        ...(idToken
          ? {
              Authorization:
                `Bearer ${idToken}`,
            }
          : {}),
        ...(body !== undefined
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
      },
      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
          }
        : {}),
      cache: "no-store",
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
    text,
    parsed,
  };
}

async function bootstrap() {
  await Promise.all([
    createAuthUser(
      recruiterAUid,
      `${recruiterAUid}@example.com`,
      "Phase7 Recruiter A"
    ),
    createAuthUser(
      recruiterBUid,
      `${recruiterBUid}@example.com`,
      "Phase7 Recruiter B"
    ),
    createAuthUser(
      b2cUid,
      `${b2cUid}@example.com`,
      "Phase7 B2C"
    ),
  ]);

  const now = Date.now();
  const batch = db.batch();

  batch.set(
    db.collection("users").doc(recruiterAUid),
    {
      uid: recruiterAUid,
      email:
        `${recruiterAUid}@example.com`,
      name: "Phase7 Recruiter A",
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
    db.collection("users").doc(recruiterBUid),
    {
      uid: recruiterBUid,
      email:
        `${recruiterBUid}@example.com`,
      name: "Phase7 Recruiter B",
      role: "RECRUITER",
      organizationId: organizationB,
      status: "ACTIVE",
      createdAt:
        Timestamp.fromMillis(now),
      updatedAt:
        Timestamp.fromMillis(now),
    }
  );

  batch.set(
    db.collection("applications").doc(applicationId),
    {
      applicationId,
      candidateId,
      jobId:
        `e2e-phase7-job-${suffix}`,
      organizationId: organizationA,
      recruiterId: recruiterAUid,
      stage: "CONTACTED",
      source: "B2B_DIRECT",
      candidateSnapshot: {
        name: "Phase7 Candidate",
        phone: "010-7000-0001",
        email: candidateEmail,
      },
      jobSnapshot: {
        title: "Phase7 Reception",
        company: "Phase7 Company",
      },
      appliedAt:
        Timestamp.fromMillis(now - 3000),
      updatedAt:
        Timestamp.fromMillis(now - 3000),
      lastActivityAt:
        Timestamp.fromMillis(now - 3000),
    }
  );

  const shared = {
    applicationId,
    candidateId,
    channel: "EMAIL",
    to: candidateEmail,
    requestedBy: recruiterAUid,
    attempts: 1,
    provider: "RESEND",
    errorCode: null,
    errorMessage: null,
    createdAt:
      Timestamp.fromMillis(now - 2000),
    updatedAt:
      Timestamp.fromMillis(now - 2000),
    failedAt: null,
  };

  batch.set(
    db.collection("communications").doc(
      communicationId(sentRequestId)
    ),
    {
      ...shared,
      communicationId:
        communicationId(sentRequestId),
      organizationId: organizationA,
      requestId: sentRequestId,
      providerIdempotencyKey:
        `application-email/${communicationId(
          sentRequestId
        )}`,
      status: "SENT",
      subject: "Phase7 sent subject",
      body: "Phase7 sent body",
      providerMessageId:
        `provider-sent-${suffix}`,
      sentAt:
        Timestamp.fromMillis(now - 1500),
    }
  );

  batch.set(
    db.collection("communications").doc(
      communicationId(failedRequestId)
    ),
    {
      ...shared,
      communicationId:
        communicationId(failedRequestId),
      organizationId: organizationA,
      requestId: failedRequestId,
      providerIdempotencyKey:
        `application-email/${communicationId(
          failedRequestId
        )}`,
      status: "FAILED",
      subject: "Phase7 failed subject",
      body: "Phase7 failed body",
      providerMessageId: null,
      errorCode: "E2E_FAILED",
      errorMessage: "seeded failure",
      failedAt:
        Timestamp.fromMillis(now - 1000),
      sentAt: null,
    }
  );

  batch.set(
    db.collection("communications").doc(
      communicationId(pendingRequestId)
    ),
    {
      ...shared,
      communicationId:
        communicationId(pendingRequestId),
      organizationId: organizationA,
      requestId: pendingRequestId,
      providerIdempotencyKey:
        `application-email/${communicationId(
          pendingRequestId
        )}`,
      status: "PENDING",
      subject: "Phase7 pending subject",
      body: "Phase7 pending body",
      provider: null,
      providerMessageId: null,
      sentAt: null,
    }
  );

  batch.set(
    db.collection("communications").doc(
      `${applicationId}__phase7_foreign_${suffix}`
    ),
    {
      ...shared,
      communicationId:
        `${applicationId}__phase7_foreign_${suffix}`,
      organizationId: organizationB,
      requestId:
        `phase7_foreign_${suffix}`,
      providerIdempotencyKey:
        `application-email/foreign-${suffix}`,
      status: "SENT",
      subject: "SHOULD_NOT_LEAK",
      body: "SHOULD_NOT_LEAK",
      providerMessageId:
        `provider-foreign-${suffix}`,
      sentAt:
        Timestamp.fromMillis(now - 500),
    }
  );

  await batch.commit();
}

async function cleanup() {
  const communicationSnapshot =
    await db
      .collection("communications")
      .where(
        "applicationId",
        "==",
        applicationId
      )
      .get();

  const batch = db.batch();

  for (const document of communicationSnapshot.docs) {
    batch.delete(document.ref);
  }

  batch.delete(
    db.collection("applications").doc(applicationId)
  );
  batch.delete(
    db.collection("users").doc(recruiterAUid)
  );
  batch.delete(
    db.collection("users").doc(recruiterBUid)
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
    recruiterAUid,
    recruiterBUid,
    b2cUid,
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

  console.log(
    "STEP_1: AUTHORIZATION_BOUNDARIES"
  );

  const unauthenticated =
    await callApi("GET", null);

  assert(
    unauthenticated.status === 401,
    "UNAUTHENTICATED_COMMUNICATION_READ_MUST_BE_401",
    `${unauthenticated.status} ${unauthenticated.text}`
  );

  const [
    recruiterAToken,
    recruiterBToken,
    b2cToken,
  ] = await Promise.all([
    exchangeCustomToken(recruiterAUid),
    exchangeCustomToken(recruiterBUid),
    exchangeCustomToken(b2cUid),
  ]);

  const crossTenant =
    await callApi(
      "GET",
      recruiterBToken
    );

  assert(
    crossTenant.status === 403 &&
      crossTenant.parsed?.code ===
        "TENANT_ACCESS_DENIED",
    "CROSS_TENANT_COMMUNICATION_READ_MUST_BE_403",
    `${crossTenant.status} ${crossTenant.text}`
  );

  const b2cDenied =
    await callApi(
      "GET",
      b2cToken
    );

  assert(
    b2cDenied.status === 403 &&
      b2cDenied.parsed?.code ===
        "B2B_USER_NOT_FOUND",
    "B2C_COMMUNICATION_READ_MUST_BE_403",
    `${b2cDenied.status} ${b2cDenied.text}`
  );

  console.log(
    "STEP_2: TENANT_SCOPED_HISTORY"
  );

  const list =
    await callApi(
      "GET",
      recruiterAToken
    );

  assert(
    list.status === 200 &&
      list.parsed?.success === true &&
      Array.isArray(list.parsed?.data),
    "COMMUNICATION_LIST_FAILED",
    `${list.status} ${list.text}`
  );

  assert(
    list.parsed.data.length === 3 &&
      list.parsed.data.every(
        (item) =>
          item.organizationId === organizationA
      ) &&
      !list.parsed.data.some(
        (item) =>
          item.subject === "SHOULD_NOT_LEAK"
      ),
    "COMMUNICATION_HISTORY_TENANT_LEAK",
    JSON.stringify(list.parsed.data)
  );

  console.log(
    "STEP_3: SENT_REQUEST_ID_IS_IDEMPOTENT_AND_RECIPIENT_IS_SERVER_CONTROLLED"
  );

  const idempotentSent =
    await callApi(
      "POST",
      recruiterAToken,
      {
        requestId: sentRequestId,
        subject: "Phase7 sent subject",
        body: "Phase7 sent body",
        to: "attacker@example.com",
      }
    );

  assert(
    idempotentSent.status === 201 &&
      idempotentSent.parsed?.success === true &&
      idempotentSent.parsed?.data?.status === "SENT" &&
      idempotentSent.parsed?.data?.to === candidateEmail,
    "SENT_IDEMPOTENT_REPLAY_FAILED",
    `${idempotentSent.status} ${idempotentSent.text}`
  );

  console.log(
    "STEP_4: REQUEST_ID_PAYLOAD_REUSE_BLOCKED"
  );

  const reused =
    await callApi(
      "POST",
      recruiterAToken,
      {
        requestId: sentRequestId,
        subject: "Different subject",
        body: "Phase7 sent body",
      }
    );

  assert(
    reused.status === 409 &&
      reused.parsed?.code ===
        "COMMUNICATION_REQUEST_ID_REUSED",
    "REQUEST_ID_REUSE_MUST_BE_BLOCKED",
    `${reused.status} ${reused.text}`
  );

  console.log(
    "STEP_5: CONCURRENT_PENDING_REQUEST_BLOCKED"
  );

  const pending =
    await callApi(
      "POST",
      recruiterAToken,
      {
        requestId: pendingRequestId,
        subject: "Phase7 pending subject",
        body: "Phase7 pending body",
      }
    );

  assert(
    pending.status === 409 &&
      pending.parsed?.code ===
        "COMMUNICATION_IN_PROGRESS",
    "PENDING_DUPLICATE_MUST_BE_BLOCKED",
    `${pending.status} ${pending.text}`
  );

  console.log(
    "STEP_6: INVALID_NEW_REQUEST_DOES_NOT_CREATE_OUTBOX"
  );

  const invalidRequestId =
    `phase7_invalid_${suffix}`;
  const invalid =
    await callApi(
      "POST",
      recruiterAToken,
      {
        requestId: invalidRequestId,
        subject: "",
        body: "body",
        to: "attacker@example.com",
      }
    );

  assert(
    invalid.status === 400 &&
      invalid.parsed?.code ===
        "EMAIL_SUBJECT_REQUIRED",
    "INVALID_COMMUNICATION_REQUEST_MUST_BE_400",
    `${invalid.status} ${invalid.text}`
  );

  const invalidSnapshot =
    await db
      .collection("communications")
      .doc(
        communicationId(
          invalidRequestId
        )
      )
      .get();

  assert(
    !invalidSnapshot.exists,
    "INVALID_REQUEST_MUST_NOT_CREATE_OUTBOX"
  );

  console.log(
    "PHASE7_COMMUNICATION_SECURITY_CHECK_PASSED"
  );
}

main()
  .then(async () => {
    await cleanup();
    console.log("CLEANUP_FINISHED");
  })
  .catch(async (error) => {
    console.error(
      "PHASE7_COMMUNICATION_SECURITY_E2E_FAILED:",
      error
    );
    await cleanup();
    process.exit(1);
  });
