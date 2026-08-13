const fs = require("fs");

const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const {
  FieldValue,
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
const b2cUid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";
const otherOrganizationId =
  "e2e-other-org";

let createdCandidateId = null;
let createdJobId = null;
let createdApplicationId = null;
let otherCandidateId = null;

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
  path,
  method = "GET",
  body
) {
  const response = await fetch(
    "http://localhost:3000" + path,
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
    // Keep raw body for diagnostics.
  }

  return {
    status: response.status,
    body: text,
    parsed,
  };
}

async function deleteQuery(snapshot) {
  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
  }

  await batch.commit();
}

async function cleanup() {
  try {
    if (createdCandidateId) {
      const candidateEvents = await db
        .collection("candidateEvents")
        .where("candidateId", "==", createdCandidateId)
        .get();
      await deleteQuery(candidateEvents);
    }

    if (createdApplicationId) {
      const appEvents = await db
        .collection("appEvents")
        .where("applicationId", "==", createdApplicationId)
        .get();
      await deleteQuery(appEvents);

      await db
        .collection("applications")
        .doc(createdApplicationId)
        .delete();
    }

    if (createdCandidateId) {
      await db
        .collection("profile")
        .doc(createdCandidateId)
        .delete();
      await db
        .collection("candidates")
        .doc(createdCandidateId)
        .delete();
    }

    if (otherCandidateId) {
      await db
        .collection("profile")
        .doc(otherCandidateId)
        .delete();
      await db
        .collection("candidates")
        .doc(otherCandidateId)
        .delete();
    }

    if (createdJobId) {
      await db
        .collection("jobs")
        .doc(createdJobId)
        .delete();
    }

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
    await exchangeCustomToken(b2cUid);
  const marker = Date.now();

  console.log(
    "STEP_1: CREATE_OPEN_JOB_AND_CANDIDATE"
  );

  const jobResult = await callApi(
    recruiterToken,
    "/api/b2b/jobs",
    "POST",
    {
      company: "Phase3 CRM Test Company",
      displayCompany: "Phase3 CRM Test Company",
      title: `Phase3 CRM E2E Job ${marker}`,
      description:
        "Candidate CRM profile synchronization test job.",
      requirements: ["고객 응대"],
      preferredQualifications: ["리셉션 경력"],
      salary: "협의",
      location: "서울",
      employmentType: "정규직",
      status: "OPEN",
    }
  );

  console.log("JOB_STATUS:", jobResult.status);

  if (
    jobResult.status !== 201 ||
    !jobResult.parsed?.success ||
    !jobResult.parsed?.data?.jobId
  ) {
    throw new Error("JOB_CREATE_FAILED");
  }

  createdJobId =
    jobResult.parsed.data.jobId;

  const candidateResult = await callApi(
    recruiterToken,
    "/api/b2b/candidates",
    "POST",
    {
      name: "Phase3 CRM Candidate",
      phone:
        "010-8800-" + String(marker).slice(-4),
      email:
        `phase3.crm.${marker}@example.com`,
      headline: "CRM 수정 전 헤드라인",
      careerSummary: "CRM 수정 전 경력 요약",
      skills: ["고객응대"],
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

  console.log(
    "STEP_2: CREATE_APPLICATION_FOR_SNAPSHOT_SYNC"
  );

  const applicationResult = await callApi(
    recruiterToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId: createdCandidateId,
      jobId: createdJobId,
    }
  );

  console.log(
    "APPLICATION_STATUS:",
    applicationResult.status
  );

  if (
    applicationResult.status !== 201 ||
    !applicationResult.parsed?.success ||
    !applicationResult.parsed?.data?.applicationId
  ) {
    throw new Error(
      "APPLICATION_CREATE_FAILED"
    );
  }

  createdApplicationId =
    applicationResult.parsed.data.applicationId;

  console.log(
    "STEP_3: SEED_OTHER_TENANT_CANDIDATE"
  );

  const otherCandidateRef =
    db.collection("candidates").doc();
  otherCandidateId = otherCandidateRef.id;
  const timestamp = FieldValue.serverTimestamp();

  await otherCandidateRef.set({
    candidateId: otherCandidateId,
    authUid: null,
    name: "Other Tenant CRM Candidate",
    phone: "010-7700-0000",
    email:
      `phase3.crm.other.${marker}@example.com`,
    source: "B2B_DIRECT",
    accountStatus: "ACTIVE",
    organizationId: otherOrganizationId,
    createdBy: "e2e-other-recruiter",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db
    .collection("profile")
    .doc(otherCandidateId)
    .set({
      candidateId: otherCandidateId,
      headline: "타 조직 후보자",
      careerSummary: "타 조직 테스트 데이터",
      skills: ["테스트"],
      careers: [],
      education: [],
      profileCompleteness: 70,
      updatedAt: FieldValue.serverTimestamp(),
    });

  console.log(
    "STEP_4: OWN_TENANT_DETAIL_READ"
  );

  const detailResult = await callApi(
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
    "DETAIL_ORGANIZATION_ID:",
    detailResult.parsed?.data?.organizationId
  );

  if (
    detailResult.status !== 200 ||
    !detailResult.parsed?.success ||
    detailResult.parsed?.data?.candidateId !==
      createdCandidateId ||
    detailResult.parsed?.data?.organizationId !==
      "jnc"
  ) {
    throw new Error(
      "OWN_TENANT_DETAIL_READ_FAILED"
    );
  }

  console.log(
    "STEP_5: UPDATE_CANDIDATE_PROFILE"
  );

  const updatedName =
    "Phase3 CRM Candidate Updated";
  const updatedPhone =
    "010-9900-" + String(marker).slice(-4);
  const updatedEmail =
    `phase3.crm.updated.${marker}@example.com`;

  const updateResult = await callApi(
    recruiterToken,
    `/api/b2b/candidates/${encodeURIComponent(
      createdCandidateId
    )}`,
    "PATCH",
    {
      name: updatedName,
      phone: updatedPhone,
      email: updatedEmail,
      headline: "VIP 리셉션 경력 후보자",
      careerSummary:
        "호텔 및 오피스 리셉션 고객 응대 경험 보유.",
      skills: [
        "고객응대",
        "VIP응대",
        "안내데스크",
      ],
    }
  );

  console.log(
    "UPDATE_STATUS:",
    updateResult.status
  );
  console.log(
    "UPDATE_BODY:",
    updateResult.body
  );

  if (
    updateResult.status !== 200 ||
    !updateResult.parsed?.success ||
    updateResult.parsed?.data?.changed !== true
  ) {
    throw new Error(
      "CANDIDATE_UPDATE_FAILED"
    );
  }

  const changedFields =
    updateResult.parsed.data.changedFields || [];

  console.log(
    "CHANGED_FIELDS:",
    changedFields.join(",")
  );

  for (const requiredField of [
    "name",
    "phone",
    "email",
    "headline",
    "careerSummary",
    "skills",
  ]) {
    if (!changedFields.includes(requiredField)) {
      throw new Error(
        `CHANGED_FIELD_MISSING_${requiredField}`
      );
    }
  }

  console.log(
    "STEP_6: VERIFY_FIRESTORE_AND_APPLICATION_SNAPSHOT"
  );

  const candidateSnapshot = await db
    .collection("candidates")
    .doc(createdCandidateId)
    .get();
  const profileSnapshot = await db
    .collection("profile")
    .doc(createdCandidateId)
    .get();
  const applicationSnapshot = await db
    .collection("applications")
    .doc(createdApplicationId)
    .get();

  const candidateData = candidateSnapshot.data();
  const profileData = profileSnapshot.data();
  const applicationData = applicationSnapshot.data();

  console.log(
    "CANDIDATE_NAME_UPDATED:",
    candidateData?.name === updatedName
  );
  console.log(
    "PROFILE_HEADLINE_UPDATED:",
    profileData?.headline ===
      "VIP 리셉션 경력 후보자"
  );
  console.log(
    "APPLICATION_SNAPSHOT_NAME:",
    applicationData?.candidateSnapshot?.name
  );

  if (
    candidateData?.name !== updatedName ||
    candidateData?.phone !== updatedPhone ||
    candidateData?.email !== updatedEmail ||
    profileData?.headline !==
      "VIP 리셉션 경력 후보자" ||
    !Array.isArray(profileData?.skills) ||
    !profileData.skills.includes("VIP응대") ||
    applicationData?.candidateSnapshot?.name !==
      updatedName ||
    applicationData?.candidateSnapshot?.phone !==
      updatedPhone ||
    applicationData?.candidateSnapshot?.email !==
      updatedEmail
  ) {
    throw new Error(
      "CANDIDATE_UPDATE_FIRESTORE_INVALID"
    );
  }

  console.log(
    "STEP_7: VERIFY_PROFILE_UPDATED_AUDIT"
  );

  const candidateEvents = await db
    .collection("candidateEvents")
    .where("candidateId", "==", createdCandidateId)
    .get();

  const profileUpdatedEvent =
    candidateEvents.docs
      .map((document) => document.data())
      .find(
        (event) =>
          event.type === "PROFILE_UPDATED"
      );

  console.log(
    "PROFILE_UPDATED_EVENT_FOUND:",
    Boolean(profileUpdatedEvent)
  );
  console.log(
    "PROFILE_UPDATED_CHANGED_BY:",
    profileUpdatedEvent?.changedBy
  );
  console.log(
    "SYNCHRONIZED_APPLICATIONS:",
    profileUpdatedEvent?.metadata
      ?.synchronizedApplications
  );

  if (
    !profileUpdatedEvent ||
    profileUpdatedEvent.organizationId !== "jnc" ||
    profileUpdatedEvent.changedBy !== recruiterUid ||
    profileUpdatedEvent.metadata
      ?.synchronizedApplications !== 1
  ) {
    throw new Error(
      "PROFILE_UPDATED_AUDIT_INVALID"
    );
  }

  const eventCountBeforeNoop =
    candidateEvents.size;

  console.log(
    "STEP_8: NOOP_UPDATE_DOES_NOT_CREATE_AUDIT"
  );

  const noopResult = await callApi(
    recruiterToken,
    `/api/b2b/candidates/${encodeURIComponent(
      createdCandidateId
    )}`,
    "PATCH",
    {
      name: updatedName,
      phone: updatedPhone,
      email: updatedEmail,
      headline: "VIP 리셉션 경력 후보자",
      careerSummary:
        "호텔 및 오피스 리셉션 고객 응대 경험 보유.",
      skills: [
        "고객응대",
        "VIP응대",
        "안내데스크",
      ],
    }
  );

  const candidateEventsAfterNoop = await db
    .collection("candidateEvents")
    .where("candidateId", "==", createdCandidateId)
    .get();

  console.log(
    "NOOP_STATUS:",
    noopResult.status
  );
  console.log(
    "NOOP_CHANGED:",
    noopResult.parsed?.data?.changed
  );
  console.log(
    "AUDIT_COUNT_UNCHANGED:",
    candidateEventsAfterNoop.size ===
      eventCountBeforeNoop
  );

  if (
    noopResult.status !== 200 ||
    noopResult.parsed?.data?.changed !== false ||
    candidateEventsAfterNoop.size !==
      eventCountBeforeNoop
  ) {
    throw new Error(
      "NOOP_UPDATE_AUDIT_FAILED"
    );
  }

  console.log(
    "STEP_9: CROSS_TENANT_DETAIL_AND_UPDATE_BLOCKED"
  );

  const crossTenantRead = await callApi(
    recruiterToken,
    `/api/b2b/candidates/${encodeURIComponent(
      otherCandidateId
    )}`
  );
  const crossTenantUpdate = await callApi(
    recruiterToken,
    `/api/b2b/candidates/${encodeURIComponent(
      otherCandidateId
    )}`,
    "PATCH",
    {
      name: "Attack",
      phone: "010-0000-0000",
      email: "attack@example.com",
      headline: "Attack",
      careerSummary: "Attack",
      skills: ["Attack"],
    }
  );

  console.log(
    "CROSS_TENANT_READ_STATUS:",
    crossTenantRead.status
  );
  console.log(
    "CROSS_TENANT_UPDATE_STATUS:",
    crossTenantUpdate.status
  );

  if (
    crossTenantRead.status !== 403 ||
    crossTenantUpdate.status !== 403
  ) {
    throw new Error(
      "CROSS_TENANT_CRM_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_10: B2C_CRM_ACCESS_DENIED"
  );

  const b2cRead = await callApi(
    b2cToken,
    `/api/b2b/candidates/${encodeURIComponent(
      createdCandidateId
    )}`
  );
  const b2cUpdate = await callApi(
    b2cToken,
    `/api/b2b/candidates/${encodeURIComponent(
      createdCandidateId
    )}`,
    "PATCH",
    {
      name: updatedName,
      phone: updatedPhone,
      email: updatedEmail,
      headline: "B2C attack",
      careerSummary: "B2C attack",
      skills: [],
    }
  );

  console.log(
    "B2C_READ_STATUS:",
    b2cRead.status
  );
  console.log(
    "B2C_UPDATE_STATUS:",
    b2cUpdate.status
  );

  if (
    b2cRead.status !== 403 ||
    b2cUpdate.status !== 403
  ) {
    throw new Error(
      "B2C_CRM_ACCESS_NOT_BLOCKED"
    );
  }

  console.log(
    "CANDIDATE_CRM_PROFILE_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "CANDIDATE_CRM_PROFILE_E2E_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });
