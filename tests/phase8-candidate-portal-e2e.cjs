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

const candidateAUid =
  `e2e-phase8-a-${suffix}`;
const candidateBUid =
  `e2e-phase8-b-${suffix}`;
const candidateAEmail =
  `${candidateAUid}@example.com`;
const candidateBEmail =
  `${candidateBUid}@example.com`;
const jobId =
  `e2e-phase8-job-${suffix}`;

const createdCandidateIds = [];
const createdApplicationIds = [];
const createdInterviewIds = [];

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
  email
) {
  await auth.createUser({
    uid,
    email,
    emailVerified: true,
    disabled: false,
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
      `ID_TOKEN_EXCHANGE_FAILED:${JSON.stringify(body)}`
    );
  }

  return body.idToken;
}

async function callApi(
  path,
  method,
  idToken,
  body
) {
  const response = await fetch(
    `${baseUrl}${path}`,
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
    body: parsed,
    text,
  };
}

function profileBody(overrides = {}) {
  return {
    name: "Phase8 Candidate",
    phone: "010-8800-1000",
    headline: "기업 리셉션 Candidate",
    careerSummary:
      "고객 응대와 안내데스크 경력을 보유하고 있습니다.",
    skills: [
      "고객응대",
      "안내데스크",
    ],
    careers: [
      {
        companyName: "Phase8 Hotel",
        role: "Front Desk",
        period: "2024.01 - 현재",
        description: "VIP 고객 응대",
      },
    ],
    education: [
      {
        schoolName: "Phase8 University",
        major: "호텔경영",
        degree: "학사",
        period: "2020.03 - 2024.02",
      },
    ],
    ...overrides,
  };
}

async function bootstrapCandidate(
  idToken,
  expectedEmail,
  overrides = {}
) {
  const result = await callApi(
    "/api/candidate/me",
    "POST",
    idToken,
    profileBody(overrides)
  );

  assert(
    result.status === 201 ||
      result.status === 200,
    "CANDIDATE_BOOTSTRAP_FAILED",
    `${result.status} ${result.text}`
  );
  assert(
    result.body?.success === true,
    "CANDIDATE_BOOTSTRAP_RESPONSE_INVALID",
    result.text
  );

  const profile =
    result.body.data.profile;

  assert(
    profile.email === expectedEmail,
    "AUTH_EMAIL_NOT_USED",
    JSON.stringify(profile)
  );
  assert(
    profile.candidateId &&
      profile.candidateId !==
        (expectedEmail === candidateAEmail
          ? candidateAUid
          : candidateBUid),
    "CANDIDATE_ID_MUST_DIFFER_FROM_AUTH_UID"
  );

  createdCandidateIds.push(
    profile.candidateId
  );

  return profile;
}

async function cleanup() {
  try {
    const eventSnapshots = [];

    for (const applicationId of createdApplicationIds) {
      eventSnapshots.push(
        await db
          .collection("appEvents")
          .where(
            "applicationId",
            "==",
            applicationId
          )
          .get()
      );
    }

    const batch = db.batch();

    for (const snapshot of eventSnapshots) {
      for (const document of snapshot.docs) {
        batch.delete(document.ref);
      }
    }

    for (const interviewId of createdInterviewIds) {
      batch.delete(
        db.collection("interviews").doc(
          interviewId
        )
      );
    }

    for (const applicationId of createdApplicationIds) {
      batch.delete(
        db.collection("applications").doc(
          applicationId
        )
      );
    }

    for (const candidateId of createdCandidateIds) {
      batch.delete(
        db.collection("profile").doc(
          candidateId
        )
      );
      batch.delete(
        db.collection("candidates").doc(
          candidateId
        )
      );
    }

    batch.delete(
      db.collection("candidateAuthLinks").doc(
        candidateAUid
      )
    );
    batch.delete(
      db.collection("candidateAuthLinks").doc(
        candidateBUid
      )
    );
    batch.delete(
      db.collection("jobs").doc(jobId)
    );

    await batch.commit();
  } catch (error) {
    console.error(
      "PHASE8_FIRESTORE_CLEANUP_FAILED:",
      error
    );
  }

  for (const uid of [
    candidateAUid,
    candidateBUid,
  ]) {
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (
        error?.code !== "auth/user-not-found"
      ) {
        console.error(
          "PHASE8_AUTH_CLEANUP_FAILED:",
          uid,
          error
        );
      }
    }
  }
}

async function main() {
  console.log(
    "STEP_1: BOOTSTRAP_AUTH_USERS"
  );

  await Promise.all([
    createAuthUser(
      candidateAUid,
      candidateAEmail
    ),
    createAuthUser(
      candidateBUid,
      candidateBEmail
    ),
  ]);

  const [tokenA, tokenB] =
    await Promise.all([
      exchangeCustomToken(candidateAUid),
      exchangeCustomToken(candidateBUid),
    ]);

  console.log(
    "STEP_2: UNAUTHENTICATED_PORTAL_DENIED"
  );

  const unauthenticated = await callApi(
    "/api/candidate/me",
    "GET",
    null
  );

  assert(
    unauthenticated.status === 401,
    "UNAUTHENTICATED_CANDIDATE_PORTAL_MUST_BE_401",
    unauthenticated.text
  );

  console.log(
    "STEP_3: RESERVED_EMAIL_SPOOF_BLOCKED_BEFORE_CREATE"
  );

  const spoofAttempt = await callApi(
    "/api/candidate/me",
    "POST",
    tokenB,
    profileBody({
      email: "spoof@example.com",
    })
  );

  assert(
    spoofAttempt.status === 400 &&
      spoofAttempt.body?.code ===
        "FORBIDDEN_SERVER_FIELD",
    "CANDIDATE_EMAIL_SPOOF_NOT_BLOCKED",
    spoofAttempt.text
  );

  const linkBeforeValid =
    await db
      .collection("candidateAuthLinks")
      .doc(candidateBUid)
      .get();
  const candidateBeforeValid =
    await db
      .collection("candidates")
      .where(
        "authUid",
        "==",
        candidateBUid
      )
      .get();

  assert(
    !linkBeforeValid.exists &&
      candidateBeforeValid.empty,
    "INVALID_BOOTSTRAP_MUST_NOT_PARTIALLY_CREATE_CANDIDATE"
  );

  console.log(
    "STEP_4: ATOMIC_CANDIDATE_PROFILE_BOOTSTRAP"
  );

  const profileA =
    await bootstrapCandidate(
      tokenA,
      candidateAEmail
    );
  const profileB =
    await bootstrapCandidate(
      tokenB,
      candidateBEmail,
      {
        name: "Phase8 Candidate B",
        phone: "010-8800-2000",
      }
    );

  const [candidateA, profileADoc, linkA] =
    await Promise.all([
      db
        .collection("candidates")
        .doc(profileA.candidateId)
        .get(),
      db
        .collection("profile")
        .doc(profileA.candidateId)
        .get(),
      db
        .collection("candidateAuthLinks")
        .doc(candidateAUid)
        .get(),
    ]);

  assert(
    candidateA.exists &&
      profileADoc.exists &&
      linkA.data()?.candidateId ===
        profileA.candidateId,
    "CANDIDATE_PROFILE_LINK_ATOMIC_BOOTSTRAP_MISSING"
  );

  console.log(
    "STEP_5: CREATE_PUBLIC_JOB_AND_APPLY"
  );

  const now = Date.now();

  await db
    .collection("jobs")
    .doc(jobId)
    .set({
      jobId,
      organizationId: "jnc",
      company: "PHASE8 INTERNAL CLIENT NAME",
      displayCompany: "프리미엄 고객사",
      title: "Phase8 Reception Position",
      description: "Phase8 candidate portal E2E job",
      requirements: [],
      preferredQualifications: [],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "OPEN",
      recruiterId: "e2e-recruiter-jnc",
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
    });

  const applyResult = await callApi(
    "/api/applications/apply",
    "POST",
    tokenA,
    {
      jobId,
    }
  );

  assert(
    applyResult.status === 201 &&
      applyResult.body?.success === true,
    "PHASE8_APPLICATION_CREATE_FAILED",
    applyResult.text
  );

  const applicationId =
    applyResult.body.data.applicationId;
  createdApplicationIds.push(applicationId);

  console.log(
    "STEP_6: CANDIDATE_PORTAL_APPLICATION_PRIVACY"
  );

  const interviewRef =
    db.collection("interviews").doc();
  createdInterviewIds.push(interviewRef.id);

  await Promise.all([
    interviewRef.set({
      interviewId: interviewRef.id,
      applicationId,
      candidateId: profileA.candidateId,
      jobId,
      organizationId: "jnc",
      recruiterId: "e2e-recruiter-jnc",
      scheduledAt:
        Timestamp.fromMillis(
          Date.now() + 24 * 60 * 60 * 1000
        ),
      method: "VIDEO",
      location:
        "https://meet.example.com/phase8",
      interviewer: "Phase8 Interviewer",
      note: "INTERNAL INTERVIEW NOTE",
      status: "SCHEDULED",
      result: null,
      createdBy: "e2e-recruiter-jnc",
      createdAt:
        Timestamp.fromMillis(Date.now()),
      updatedAt:
        Timestamp.fromMillis(Date.now()),
    }),
    db
      .collection("applications")
      .doc(applicationId)
      .update({
        stage: "INTERVIEW",
        updatedAt:
          Timestamp.fromMillis(Date.now()),
      }),
  ]);

  const applicationsA = await callApi(
    "/api/candidate/applications",
    "GET",
    tokenA
  );

  assert(
    applicationsA.status === 200 &&
      applicationsA.body?.success === true,
    "CANDIDATE_APPLICATION_LIST_FAILED",
    applicationsA.text
  );

  const ownApplication =
    applicationsA.body.data.find(
      (item) =>
        item.applicationId === applicationId
    );

  assert(
    ownApplication?.company ===
      "프리미엄 고객사" &&
      !JSON.stringify(ownApplication).includes(
        "PHASE8 INTERNAL CLIENT NAME"
      ),
    "INTERNAL_COMPANY_NAME_LEAKED",
    JSON.stringify(ownApplication)
  );
  assert(
    ownApplication?.nextInterview?.location ===
      "https://meet.example.com/phase8" &&
      !JSON.stringify(ownApplication).includes(
        "INTERNAL INTERVIEW NOTE"
      ),
    "CANDIDATE_INTERVIEW_VIEW_INVALID",
    JSON.stringify(ownApplication)
  );

  console.log(
    "STEP_7: PROFILE_UPDATE_SYNCS_APPLICATION_SNAPSHOT"
  );

  const patchResult = await callApi(
    "/api/candidate/me",
    "PATCH",
    tokenA,
    profileBody({
      name: "Phase8 Candidate Updated",
      phone: "010-9999-8800",
      headline: "Updated Candidate Headline",
    })
  );

  assert(
    patchResult.status === 200 &&
      patchResult.body?.data?.name ===
        "Phase8 Candidate Updated",
    "CANDIDATE_PROFILE_PATCH_FAILED",
    patchResult.text
  );

  const applicationAfterPatch =
    await db
      .collection("applications")
      .doc(applicationId)
      .get();

  assert(
    applicationAfterPatch.data()?.candidateSnapshot?.name ===
      "Phase8 Candidate Updated" &&
      applicationAfterPatch.data()?.candidateSnapshot?.phone ===
        "010-9999-8800",
    "APPLICATION_CANDIDATE_SNAPSHOT_NOT_SYNCED"
  );

  const profileEvents = await db
    .collection("appEvents")
    .where(
      "applicationId",
      "==",
      applicationId
    )
    .get();

  assert(
    profileEvents.docs.some(
      (document) => {
        const data = document.data();
        return (
          data.type === "PROFILE_UPDATED" &&
          data.changedBy === candidateAUid
        );
      }
    ),
    "CANDIDATE_SELF_SERVICE_AUDIT_MISSING"
  );

  console.log(
    "STEP_8: OTHER_CANDIDATE_ISOLATED"
  );

  const applicationsB = await callApi(
    "/api/candidate/applications",
    "GET",
    tokenB
  );

  assert(
    applicationsB.status === 200 &&
      applicationsB.body?.success === true &&
      !applicationsB.body.data.some(
        (item) =>
          item.applicationId === applicationId
      ),
    "CANDIDATE_APPLICATION_TENANT_LEAK",
    applicationsB.text
  );

  assert(
    profileA.candidateId !==
      profileB.candidateId,
    "CANDIDATE_IDENTITIES_MUST_BE_DISTINCT"
  );

  console.log(
    "PHASE8_CANDIDATE_PORTAL_E2E_PASSED"
  );
}

main()
  .then(async () => {
    await cleanup();
    console.log("CLEANUP_FINISHED");
  })
  .catch(async (error) => {
    console.error(
      "PHASE8_CANDIDATE_PORTAL_E2E_FAILED:",
      error
    );
    await cleanup();
    process.exit(1);
  });
