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

const actorUid =
  "e2e-recruiter-jnc";

const b2cCandidateUid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";

const sameOrgRecruiterUid =
  "e2e-recruiter-jnc-operations";

const sameOrgRecruiterEmail =
  "e2e.recruiter.jnc.operations@example.com";

const otherOrgRecruiterUid =
  "e2e-recruiter-other-operations";

const otherOrgRecruiterEmail =
  "e2e.recruiter.other.operations@example.com";

let createdJobId = null;
let createdCandidateId = null;
let createdApplicationId = null;
let createdInterviewId = null;

async function ensureAuthUser(
  uid,
  email,
  displayName
) {
  try {
    await auth.getUser(uid);
  } catch (error) {
    if (
      error?.code !==
      "auth/user-not-found"
    ) {
      throw error;
    }

    await auth.createUser({
      uid,
      email,
      displayName,
      emailVerified: true,
    });
  }
}

async function bootstrapRecruiters() {
  await ensureAuthUser(
    sameOrgRecruiterUid,
    sameOrgRecruiterEmail,
    "E2E Operations Recruiter"
  );

  await ensureAuthUser(
    otherOrgRecruiterUid,
    otherOrgRecruiterEmail,
    "E2E Other Operations Recruiter"
  );

  await db
    .collection("users")
    .doc(sameOrgRecruiterUid)
    .set({
      uid: sameOrgRecruiterUid,
      email: sameOrgRecruiterEmail,
      name: "E2E Operations Recruiter",
      role: "RECRUITER",
      organizationId: "jnc",
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  await db
    .collection("users")
    .doc(otherOrgRecruiterUid)
    .set({
      uid: otherOrgRecruiterUid,
      email: otherOrgRecruiterEmail,
      name: "E2E Other Operations Recruiter",
      role: "RECRUITER",
      organizationId: "e2e-other-operations-org",
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

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
  method,
  body
) {
  const response = await fetch(
    "http://localhost:3000" + url,
    {
      method,
      headers: {
        ...(body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        Authorization:
          "Bearer " + idToken,
      },
      ...(body
        ? {
            body:
              JSON.stringify(body),
          }
        : {}),
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

async function cleanup() {
  try {
    if (createdApplicationId) {
      const events = await db
        .collection("appEvents")
        .where(
          "applicationId",
          "==",
          createdApplicationId
        )
        .get();

      const interviews = await db
        .collection("interviews")
        .where(
          "applicationId",
          "==",
          createdApplicationId
        )
        .get();

      const batch = db.batch();

      for (
        const eventDocument of
        events.docs
      ) {
        batch.delete(
          eventDocument.ref
        );
      }

      for (
        const interviewDocument of
        interviews.docs
      ) {
        batch.delete(
          interviewDocument.ref
        );
      }

      batch.delete(
        db
          .collection("applications")
          .doc(createdApplicationId)
      );

      await batch.commit();
    }

    const cleanupBatch = db.batch();

    if (createdCandidateId) {
      cleanupBatch.delete(
        db
          .collection("profile")
          .doc(createdCandidateId)
      );

      cleanupBatch.delete(
        db
          .collection("candidates")
          .doc(createdCandidateId)
      );
    }

    if (createdJobId) {
      cleanupBatch.delete(
        db
          .collection("jobs")
          .doc(createdJobId)
      );
    }

    cleanupBatch.delete(
      db
        .collection("users")
        .doc(sameOrgRecruiterUid)
    );

    cleanupBatch.delete(
      db
        .collection("users")
        .doc(otherOrgRecruiterUid)
    );

    await cleanupBatch.commit();

    for (
      const uid of [
        sameOrgRecruiterUid,
        otherOrgRecruiterUid,
      ]
    ) {
      try {
        await auth.deleteUser(uid);
      } catch (error) {
        if (
          error?.code !==
          "auth/user-not-found"
        ) {
          throw error;
        }
      }
    }

    console.log(
      "CLEANUP_FINISHED"
    );
  } catch (error) {
    console.error(
      "CLEANUP_FAILED:",
      error instanceof Error
        ? error.stack || error.message
        : error
    );
  }
}

async function run() {
  await bootstrapRecruiters();

  const actorToken =
    await exchangeCustomToken(
      actorUid
    );

  console.log(
    "STEP_1: CREATE_OPEN_JOB"
  );

  const jobResult = await callApi(
    actorToken,
    "/api/b2b/jobs",
    "POST",
    {
      company:
        "Phase2 Operations Company",
      displayCompany:
        "Phase2 Operations Company",
      title:
        "Phase2 Operations Job " +
        Date.now(),
      description:
        "Recruiter assignment and interview E2E job.",
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

  console.log(
    "JOB_STATUS:",
    jobResult.status
  );

  if (
    jobResult.status !== 201 ||
    !jobResult.parsed?.success ||
    !jobResult.parsed?.data?.jobId
  ) {
    throw new Error(
      "OPEN_JOB_CREATE_FAILED"
    );
  }

  createdJobId =
    jobResult.parsed.data.jobId;

  console.log(
    "STEP_2: CREATE_PASSIVE_CANDIDATE"
  );

  const marker = Date.now();

  const candidateResult = await callApi(
    actorToken,
    "/api/b2b/candidates",
    "POST",
    {
      name:
        "Phase2 Operations Candidate",
      phone:
        "010-7777-" +
        String(marker).slice(-4),
      email:
        `phase2.operations.${marker}@example.com`,
      headline:
        "운영 E2E 후보자",
      careerSummary:
        "Recruiter assignment and interview E2E candidate.",
      skills: [
        "고객응대",
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
      "PASSIVE_CANDIDATE_CREATE_FAILED"
    );
  }

  createdCandidateId =
    candidateResult.parsed.data.candidateId;

  console.log(
    "STEP_3: CREATE_DIRECT_APPLICATION"
  );

  const applicationResult = await callApi(
    actorToken,
    "/api/b2b/applications",
    "POST",
    {
      candidateId:
        createdCandidateId,
      jobId:
        createdJobId,
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
      "DIRECT_APPLICATION_CREATE_FAILED"
    );
  }

  createdApplicationId =
    applicationResult.parsed.data.applicationId;

  console.log(
    "CREATED_APPLICATION_ID:",
    createdApplicationId
  );

  console.log(
    "STEP_4: TENANT_RECRUITER_LIST"
  );

  const recruitersResult = await callApi(
    actorToken,
    "/api/b2b/recruiters?organizationId=jnc",
    "GET"
  );

  console.log(
    "RECRUITERS_STATUS:",
    recruitersResult.status
  );

  const recruiterUids =
    Array.isArray(
      recruitersResult.parsed?.data
    )
      ? recruitersResult.parsed.data.map(
          (item) => item.uid
        )
      : [];

  console.log(
    "SAME_ORG_RECRUITER_VISIBLE:",
    recruiterUids.includes(
      sameOrgRecruiterUid
    )
  );

  console.log(
    "OTHER_ORG_RECRUITER_HIDDEN:",
    !recruiterUids.includes(
      otherOrgRecruiterUid
    )
  );

  if (
    recruitersResult.status !== 200 ||
    !recruiterUids.includes(
      sameOrgRecruiterUid
    ) ||
    recruiterUids.includes(
      otherOrgRecruiterUid
    )
  ) {
    throw new Error(
      "TENANT_RECRUITER_LIST_FAILED"
    );
  }

  console.log(
    "STEP_5: ASSIGN_RECRUITER"
  );

  const assignResult = await callApi(
    actorToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/assignee",
    "PATCH",
    {
      recruiterId:
        sameOrgRecruiterUid,
      note:
        "Phase2 operations E2E 담당자 배정",
    }
  );

  console.log(
    "ASSIGN_STATUS:",
    assignResult.status
  );

  console.log(
    "ASSIGN_BODY:",
    assignResult.body
  );

  if (
    assignResult.status !== 200 ||
    !assignResult.parsed?.success ||
    assignResult.parsed?.data?.recruiterId !==
      sameOrgRecruiterUid ||
    assignResult.parsed?.data?.changed !== true
  ) {
    throw new Error(
      "RECRUITER_ASSIGN_FAILED"
    );
  }

  const assignedApplication =
    await db
      .collection("applications")
      .doc(createdApplicationId)
      .get();

  console.log(
    "APPLICATION_RECRUITER_ID:",
    assignedApplication.data()?.recruiterId
  );

  if (
    assignedApplication.data()?.recruiterId !==
    sameOrgRecruiterUid
  ) {
    throw new Error(
      "APPLICATION_RECRUITER_NOT_UPDATED"
    );
  }

  const assignmentEvents = await db
    .collection("appEvents")
    .where(
      "applicationId",
      "==",
      createdApplicationId
    )
    .get();

  const assignmentEvent =
    assignmentEvents.docs
      .map((document) =>
        document.data()
      )
      .find(
        (event) =>
          event.type ===
          "RECRUITER_ASSIGNED"
      );

  console.log(
    "ASSIGNMENT_EVENT_FOUND:",
    Boolean(assignmentEvent)
  );

  if (
    !assignmentEvent ||
    assignmentEvent.changedBy !==
      actorUid ||
    assignmentEvent.metadata?.toRecruiterId !==
      sameOrgRecruiterUid
  ) {
    throw new Error(
      "RECRUITER_ASSIGN_EVENT_FAILED"
    );
  }

  console.log(
    "STEP_6: CROSS_TENANT_ASSIGNEE_BLOCKED"
  );

  const crossTenantAssign = await callApi(
    actorToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/assignee",
    "PATCH",
    {
      recruiterId:
        otherOrgRecruiterUid,
    }
  );

  console.log(
    "CROSS_TENANT_ASSIGN_STATUS:",
    crossTenantAssign.status
  );

  console.log(
    "CROSS_TENANT_ASSIGN_BODY:",
    crossTenantAssign.body
  );

  if (
    crossTenantAssign.status !== 403 ||
    crossTenantAssign.parsed?.code !==
      "ASSIGNEE_TENANT_MISMATCH"
  ) {
    throw new Error(
      "CROSS_TENANT_ASSIGNEE_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_7: SCHEDULE_INTERVIEW"
  );

  const scheduledAt =
    new Date(
      Date.now() +
      24 * 60 * 60 * 1000
    ).toISOString();

  const interviewResult = await callApi(
    actorToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/interviews",
    "POST",
    {
      scheduledAt,
      method: "ONSITE",
      location:
        "서울 테스트 회의실",
      interviewer:
        "테스트 면접관",
      note:
        "Phase2 operations E2E 면접 일정",
    }
  );

  console.log(
    "INTERVIEW_STATUS:",
    interviewResult.status
  );

  console.log(
    "INTERVIEW_BODY:",
    interviewResult.body
  );

  if (
    interviewResult.status !== 201 ||
    !interviewResult.parsed?.success ||
    !interviewResult.parsed?.data?.interviewId
  ) {
    throw new Error(
      "INTERVIEW_SCHEDULE_FAILED"
    );
  }

  createdInterviewId =
    interviewResult.parsed.data.interviewId;

  const interviewSnapshot =
    await db
      .collection("interviews")
      .doc(createdInterviewId)
      .get();

  const interviewData =
    interviewSnapshot.data();

  console.log(
    "INTERVIEW_EXISTS:",
    interviewSnapshot.exists
  );

  console.log(
    "INTERVIEW_ORGANIZATION_ID:",
    interviewData?.organizationId
  );

  console.log(
    "INTERVIEW_RECRUITER_ID:",
    interviewData?.recruiterId
  );

  console.log(
    "INTERVIEW_CREATED_BY:",
    interviewData?.createdBy
  );

  if (
    !interviewSnapshot.exists ||
    interviewData?.organizationId !==
      "jnc" ||
    interviewData?.recruiterId !==
      sameOrgRecruiterUid ||
    interviewData?.createdBy !==
      actorUid ||
    interviewData?.status !==
      "SCHEDULED"
  ) {
    throw new Error(
      "INTERVIEW_DATA_FAILED"
    );
  }

  console.log(
    "STEP_8: INTERVIEW_READBACK"
  );

  const interviewListResult = await callApi(
    actorToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/interviews",
    "GET"
  );

  const interviewIds =
    Array.isArray(
      interviewListResult.parsed?.data
    )
      ? interviewListResult.parsed.data.map(
          (item) =>
            item.interviewId
        )
      : [];

  console.log(
    "INTERVIEW_LIST_STATUS:",
    interviewListResult.status
  );

  console.log(
    "CREATED_INTERVIEW_IN_LIST:",
    interviewIds.includes(
      createdInterviewId
    )
  );

  if (
    interviewListResult.status !== 200 ||
    !interviewIds.includes(
      createdInterviewId
    )
  ) {
    throw new Error(
      "INTERVIEW_READBACK_FAILED"
    );
  }

  console.log(
    "STEP_9: ACTIVITY_TIMELINE_METADATA"
  );

  const activityResult = await callApi(
    actorToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/activity",
    "GET"
  );

  const activities =
    Array.isArray(
      activityResult.parsed?.data
    )
      ? activityResult.parsed.data
      : [];

  const recruiterActivity =
    activities.find(
      (item) =>
        item.type ===
        "RECRUITER_ASSIGNED"
    );

  const interviewActivity =
    activities.find(
      (item) =>
        item.type ===
        "INTERVIEW_SCHEDULED"
    );

  console.log(
    "RECRUITER_ACTIVITY_FOUND:",
    Boolean(recruiterActivity)
  );

  console.log(
    "INTERVIEW_ACTIVITY_FOUND:",
    Boolean(interviewActivity)
  );

  console.log(
    "INTERVIEW_ACTIVITY_METADATA_ID:",
    interviewActivity?.metadata?.interviewId
  );

  if (
    activityResult.status !== 200 ||
    recruiterActivity?.metadata?.toRecruiterId !==
      sameOrgRecruiterUid ||
    interviewActivity?.metadata?.interviewId !==
      createdInterviewId
  ) {
    throw new Error(
      "OPERATIONS_ACTIVITY_METADATA_FAILED"
    );
  }

  console.log(
    "STEP_10: B2C_OPERATIONS_ACCESS_DENIED"
  );

  const b2cToken =
    await exchangeCustomToken(
      b2cCandidateUid
    );

  const b2cAssignResult = await callApi(
    b2cToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/assignee",
    "PATCH",
    {
      recruiterId:
        sameOrgRecruiterUid,
    }
  );

  const b2cInterviewResult = await callApi(
    b2cToken,
    "/api/b2b/applications/" +
      encodeURIComponent(
        createdApplicationId
      ) +
      "/interviews",
    "GET"
  );

  console.log(
    "B2C_ASSIGN_STATUS:",
    b2cAssignResult.status
  );

  console.log(
    "B2C_INTERVIEW_STATUS:",
    b2cInterviewResult.status
  );

  if (
    b2cAssignResult.status !== 403 ||
    b2cInterviewResult.status !== 403
  ) {
    throw new Error(
      "B2C_OPERATIONS_ACCESS_NOT_BLOCKED"
    );
  }

  console.log(
    "APPLICATION_OPERATIONS_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "APPLICATION_OPERATIONS_E2E_FAILED:",
      error instanceof Error
        ? error.stack || error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(cleanup);
