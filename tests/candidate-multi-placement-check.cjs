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
const createdJobIds = [];
const createdApplicationIds = [];
let otherTenantJobId = null;

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
    // raw response is retained for diagnostics
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

async function createOpenJob(
  token,
  marker,
  suffix
) {
  const result = await callApi(
    token,
    "/api/b2b/jobs",
    "POST",
    {
      company: "Phase3 Placement Company",
      displayCompany: "Phase3 Placement Company",
      title: `Phase3 Placement Job ${suffix} ${marker}`,
      description:
        "Candidate multi-placement E2E job.",
      requirements: [
        "고객 응대 경험",
      ],
      preferredQualifications: [
        "리셉션 경력",
      ],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "OPEN",
    }
  );

  if (
    result.status !== 201 ||
    !result.parsed?.success ||
    !result.parsed?.data?.jobId
  ) {
    throw new Error(
      `OPEN_JOB_${suffix}_CREATE_FAILED`
    );
  }

  createdJobIds.push(
    result.parsed.data.jobId
  );

  return result.parsed.data.jobId;
}

async function cleanup() {
  try {
    for (
      const applicationId of
      createdApplicationIds
    ) {
      const events = await db
        .collection("appEvents")
        .where(
          "applicationId",
          "==",
          applicationId
        )
        .get();

      const eventBatch = db.batch();

      events.docs.forEach(
        (document) =>
          eventBatch.delete(document.ref)
      );

      eventBatch.delete(
        db
          .collection("applications")
          .doc(applicationId)
      );

      await eventBatch.commit();
    }

    const batch = db.batch();

    for (const jobId of [
      ...createdJobIds,
      otherTenantJobId,
    ]) {
      if (jobId) {
        batch.delete(
          db.collection("jobs").doc(jobId)
        );
      }
    }

    if (createdCandidateId) {
      batch.delete(
        db
          .collection("profile")
          .doc(createdCandidateId)
      );
      batch.delete(
        db
          .collection("candidates")
          .doc(createdCandidateId)
      );
    }

    await batch.commit();

    console.log("CLEANUP_FINISHED");
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
    await exchangeCustomToken(recruiterUid);
  const b2cToken =
    await exchangeCustomToken(candidateUid);
  const marker = Date.now();

  console.log(
    "STEP_1: CREATE_CANDIDATE_AND_TWO_OPEN_JOBS"
  );

  const candidateResult = await callApi(
    recruiterToken,
    "/api/b2b/candidates",
    "POST",
    {
      name: "Phase3 Multi Placement Candidate",
      phone:
        "010-8800-" +
        String(marker).slice(-4),
      email:
        `phase3.placement.${marker}@example.com`,
      headline:
        "멀티 공고 투입 테스트 후보자",
      careerSummary:
        "Phase 3 candidate multi-placement E2E.",
      skills: [
        "고객응대",
        "리셉션",
      ],
    }
  );

  console.log(
    "CANDIDATE_STATUS:",
    candidateResult.status
  );

  if (
    candidateResult.status !== 201 ||
    !candidateResult.parsed?.success ||
    !candidateResult.parsed?.data?.candidateId
  ) {
    throw new Error(
      "CANDIDATE_CREATE_FAILED"
    );
  }

  createdCandidateId =
    candidateResult.parsed.data.candidateId;

  const jobA = await createOpenJob(
    recruiterToken,
    marker,
    "A"
  );
  const jobB = await createOpenJob(
    recruiterToken,
    marker,
    "B"
  );

  console.log("JOB_A:", jobA);
  console.log("JOB_B:", jobB);

  console.log(
    "STEP_2: PLACE_EXISTING_CANDIDATE_IN_JOB_A"
  );

  const applicationA = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId: createdCandidateId,
      jobId: jobA,
    }
  );

  console.log(
    "APPLICATION_A_STATUS:",
    applicationA.status
  );

  if (
    applicationA.status !== 201 ||
    !applicationA.parsed?.data?.applicationId
  ) {
    throw new Error(
      "APPLICATION_A_CREATE_FAILED"
    );
  }

  createdApplicationIds.push(
    applicationA.parsed.data.applicationId
  );

  console.log(
    "STEP_3: FIRST_PLACEMENT_HISTORY_READ"
  );

  const firstHistory = await callApi(
    recruiterToken,
    `/api/b2b/candidates/${encodeURIComponent(createdCandidateId)}/applications`
  );

  console.log(
    "FIRST_HISTORY_STATUS:",
    firstHistory.status
  );
  console.log(
    "FIRST_HISTORY_COUNT:",
    firstHistory.parsed?.data?.length
  );

  if (
    firstHistory.status !== 200 ||
    firstHistory.parsed?.data?.length !== 1 ||
    firstHistory.parsed.data[0].jobId !== jobA
  ) {
    throw new Error(
      "FIRST_PLACEMENT_HISTORY_FAILED"
    );
  }

  console.log(
    "STEP_4: PLACE_SAME_CANDIDATE_IN_JOB_B"
  );

  const applicationB = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId: createdCandidateId,
      jobId: jobB,
    }
  );

  console.log(
    "APPLICATION_B_STATUS:",
    applicationB.status
  );

  if (
    applicationB.status !== 201 ||
    !applicationB.parsed?.data?.applicationId
  ) {
    throw new Error(
      "APPLICATION_B_CREATE_FAILED"
    );
  }

  createdApplicationIds.push(
    applicationB.parsed.data.applicationId
  );

  console.log(
    "STEP_5: VERIFY_TWO_INDEPENDENT_APPLICATIONS"
  );

  const secondHistory = await callApi(
    recruiterToken,
    `/api/b2b/candidates/${encodeURIComponent(createdCandidateId)}/applications`
  );

  const history =
    secondHistory.parsed?.data || [];

  console.log(
    "SECOND_HISTORY_STATUS:",
    secondHistory.status
  );
  console.log(
    "SECOND_HISTORY_COUNT:",
    history.length
  );

  const historyByJob = new Map(
    history.map((item) => [
      item.jobId,
      item,
    ])
  );

  const expectedA =
    `${createdCandidateId}__${jobA}`;
  const expectedB =
    `${createdCandidateId}__${jobB}`;

  const itemA = historyByJob.get(jobA);
  const itemB = historyByJob.get(jobB);

  console.log(
    "DETERMINISTIC_A:",
    itemA?.applicationId === expectedA
  );
  console.log(
    "DETERMINISTIC_B:",
    itemB?.applicationId === expectedB
  );

  if (
    secondHistory.status !== 200 ||
    history.length !== 2 ||
    itemA?.applicationId !== expectedA ||
    itemB?.applicationId !== expectedB ||
    itemA?.stage !== "NEW" ||
    itemB?.stage !== "NEW" ||
    itemA?.source !== "B2B_DIRECT" ||
    itemB?.source !== "B2B_DIRECT"
  ) {
    throw new Error(
      "MULTI_PLACEMENT_INVARIANT_FAILED"
    );
  }

  console.log(
    "STEP_6: VERIFY_APPLICATION_CREATED_AUDITS"
  );

  for (const applicationId of [
    expectedA,
    expectedB,
  ]) {
    const events = await db
      .collection("appEvents")
      .where(
        "applicationId",
        "==",
        applicationId
      )
      .get();

    const createdEvent =
      events.docs
        .map((document) => document.data())
        .find(
          (event) =>
            event.type === "APPLICATION_CREATED"
        );

    if (
      !createdEvent ||
      createdEvent.changedBy !== recruiterUid ||
      createdEvent.organizationId !== "jnc"
    ) {
      throw new Error(
        "APPLICATION_CREATED_AUDIT_FAILED"
      );
    }
  }

  console.log(
    "APPLICATION_CREATED_AUDITS_OK: true"
  );

  console.log(
    "STEP_7: DUPLICATE_PLACEMENT_BLOCKED"
  );

  const duplicate = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId: createdCandidateId,
      jobId: jobA,
    }
  );

  console.log(
    "DUPLICATE_STATUS:",
    duplicate.status
  );

  if (
    duplicate.status !== 409 ||
    duplicate.parsed?.code !==
      "DUPLICATE_APPLICATION"
  ) {
    throw new Error(
      "DUPLICATE_PLACEMENT_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_8: CROSS_TENANT_JOB_PLACEMENT_BLOCKED"
  );

  otherTenantJobId =
    db.collection("jobs").doc().id;

  await db
    .collection("jobs")
    .doc(otherTenantJobId)
    .set({
      jobId: otherTenantJobId,
      organizationId: "e2e-other-org",
      company: "Other Tenant Company",
      displayCompany: "Other Tenant Company",
      title: "Other Tenant OPEN Job",
      description: "Cross tenant placement test",
      requirements: [],
      preferredQualifications: [],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "OPEN",
      recruiterId: "e2e-other-recruiter",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  const crossTenant = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId: createdCandidateId,
      jobId: otherTenantJobId,
    }
  );

  console.log(
    "CROSS_TENANT_STATUS:",
    crossTenant.status
  );
  console.log(
    "CROSS_TENANT_CODE:",
    crossTenant.parsed?.code
  );

  if (
    crossTenant.status !== 403 ||
    crossTenant.parsed?.code !==
      "TENANT_ACCESS_DENIED"
  ) {
    throw new Error(
      "CROSS_TENANT_PLACEMENT_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_9: B2C_PLACEMENT_HISTORY_DENIED"
  );

  const b2cHistory = await callApi(
    b2cToken,
    `/api/b2b/candidates/${encodeURIComponent(createdCandidateId)}/applications`
  );

  console.log(
    "B2C_HISTORY_STATUS:",
    b2cHistory.status
  );

  if (
    b2cHistory.status !== 403 ||
    b2cHistory.parsed?.code !==
      "B2B_USER_NOT_FOUND"
  ) {
    throw new Error(
      "B2C_PLACEMENT_HISTORY_NOT_BLOCKED"
    );
  }

  console.log(
    "CANDIDATE_MULTI_PLACEMENT_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "CANDIDATE_MULTI_PLACEMENT_E2E_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );
    process.exitCode = 1;
  })
  .finally(cleanup);
