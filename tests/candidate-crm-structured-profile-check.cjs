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

  const text =
    await response.text();

  let parsed = null;

  try {
    parsed =
      JSON.parse(text);
  } catch {
    // Keep raw response for diagnostics.
  }

  return {
    status:
      response.status,
    body:
      text,
    parsed,
  };
}

async function deleteQuery(
  snapshot
) {
  if (snapshot.empty) {
    return;
  }

  const batch =
    db.batch();

  for (
    const document of snapshot.docs
  ) {
    batch.delete(
      document.ref
    );
  }

  await batch.commit();
}

async function cleanup() {
  try {
    for (
      const candidateId of [
        createdCandidateId,
        otherCandidateId,
      ]
    ) {
      if (!candidateId) {
        continue;
      }

      const candidateEvents =
        await db
          .collection(
            "candidateEvents"
          )
          .where(
            "candidateId",
            "==",
            candidateId
          )
          .get();

      await deleteQuery(
        candidateEvents
      );

      await db
        .collection("profile")
        .doc(candidateId)
        .delete();

      await db
        .collection("candidates")
        .doc(candidateId)
        .delete();
    }

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
  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );

  const b2cToken =
    await exchangeCustomToken(
      b2cUid
    );

  const marker =
    Date.now();

  const baseProfile = {
    name:
      "Phase4 Structured Candidate",
    phone:
      "010-6400-" +
      String(marker).slice(-4),
    email:
      `phase4.structured.${marker}@example.com`,
    headline:
      "기업 리셉션 경력 후보자",
    careerSummary:
      "고객 응대 및 안내데스크 경력 보유.",
    skills: [
      "고객응대",
      "안내데스크",
    ],
  };

  const careers = [
    {
      companyName:
        "한성자동차",
      role:
        "서비스센터 리셉션",
      period:
        "2023.07 - 현재",
      description:
        "내방 고객 응대, AS 접수 및 예약 관리",
    },
    {
      companyName:
        "테스트호텔",
      role:
        "프론트 데스크",
      period:
        "2021.01 - 2023.06",
      description:
        "체크인·체크아웃 및 VIP 고객 응대",
    },
  ];

  const education = [
    {
      schoolName:
        "테스트대학교",
      major:
        "호텔경영학",
      degree:
        "학사",
      period:
        "2017.03 - 2021.02",
    },
  ];

  console.log(
    "STEP_1: CREATE_CANDIDATE"
  );

  const candidateResult =
    await callApi(
      recruiterToken,
      "/api/b2b/candidates",
      "POST",
      baseProfile
    );

  console.log(
    "CREATE_STATUS:",
    candidateResult.status
  );

  if (
    candidateResult.status !== 201 ||
    !candidateResult.parsed?.success ||
    !candidateResult.parsed
      ?.data?.candidateId
  ) {
    throw new Error(
      "CANDIDATE_CREATE_FAILED"
    );
  }

  createdCandidateId =
    candidateResult.parsed
      .data.candidateId;

  console.log(
    "CANDIDATE_ID:",
    createdCandidateId
  );

  console.log(
    "STEP_2: SEED_OTHER_TENANT_CANDIDATE"
  );

  const otherCandidateRef =
    db
      .collection("candidates")
      .doc();

  otherCandidateId =
    otherCandidateRef.id;

  const serverTimestamp =
    FieldValue.serverTimestamp();

  await otherCandidateRef.set({
    candidateId:
      otherCandidateId,
    authUid: null,
    name:
      "Other Tenant Phase4 Candidate",
    phone:
      "010-6500-0000",
    email:
      `phase4.other.${marker}@example.com`,
    source:
      "B2B_DIRECT",
    accountStatus:
      "ACTIVE",
    organizationId:
      otherOrganizationId,
    createdBy:
      "e2e-other-recruiter",
    createdAt:
      serverTimestamp,
    updatedAt:
      serverTimestamp,
  });

  await db
    .collection("profile")
    .doc(otherCandidateId)
    .set({
      candidateId:
        otherCandidateId,
      headline:
        "Other Tenant",
      careerSummary:
        "Other Tenant",
      skills: [
        "테스트",
      ],
      careers: [],
      education: [],
      profileCompleteness:
        70,
      updatedAt:
        FieldValue.serverTimestamp(),
    });

  console.log(
    "STEP_3: UPDATE_STRUCTURED_PROFILE"
  );

  const updateResult =
    await callApi(
      recruiterToken,
      `/api/b2b/candidates/${encodeURIComponent(
        createdCandidateId
      )}`,
      "PATCH",
      {
        ...baseProfile,
        careers,
        education,
      }
    );

  console.log(
    "STRUCTURED_UPDATE_STATUS:",
    updateResult.status
  );

  console.log(
    "STRUCTURED_UPDATE_BODY:",
    updateResult.body
  );

  if (
    updateResult.status !== 200 ||
    !updateResult.parsed?.success ||
    updateResult.parsed
      ?.data?.changed !== true
  ) {
    throw new Error(
      "STRUCTURED_PROFILE_UPDATE_FAILED"
    );
  }

  const changedFields =
    updateResult.parsed
      .data.changedFields || [];

  console.log(
    "CHANGED_FIELDS:",
    changedFields.join(",")
  );

  if (
    !changedFields.includes(
      "careers"
    ) ||
    !changedFields.includes(
      "education"
    )
  ) {
    throw new Error(
      "STRUCTURED_CHANGED_FIELDS_MISSING"
    );
  }

  const updatedCandidate =
    updateResult.parsed
      .data.candidate;

  console.log(
    "CAREER_COUNT:",
    updatedCandidate
      ?.careers?.length
  );

  console.log(
    "EDUCATION_COUNT:",
    updatedCandidate
      ?.education?.length
  );

  console.log(
    "PROFILE_COMPLETENESS:",
    updatedCandidate
      ?.profileCompleteness
  );

  if (
    updatedCandidate
      ?.careers?.length !== 2 ||
    updatedCandidate
      ?.education?.length !== 1 ||
    updatedCandidate
      ?.profileCompleteness !== 100
  ) {
    throw new Error(
      "STRUCTURED_RESPONSE_INVALID"
    );
  }

  console.log(
    "STEP_4: VERIFY_FIRESTORE_AND_READBACK"
  );

  const profileSnapshot =
    await db
      .collection("profile")
      .doc(createdCandidateId)
      .get();

  const profileData =
    profileSnapshot.data();

  if (
    !Array.isArray(
      profileData?.careers
    ) ||
    profileData.careers.length !== 2 ||
    profileData.careers[0]
      ?.companyName !==
      "한성자동차" ||
    !Array.isArray(
      profileData?.education
    ) ||
    profileData.education.length !== 1 ||
    profileData.education[0]
      ?.schoolName !==
      "테스트대학교" ||
    profileData
      ?.profileCompleteness !== 100
  ) {
    throw new Error(
      "STRUCTURED_FIRESTORE_INVALID"
    );
  }

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

  if (
    detailResult.status !== 200 ||
    !detailResult.parsed?.success ||
    detailResult.parsed
      ?.data?.careers?.length !== 2 ||
    detailResult.parsed
      ?.data?.education?.length !== 1 ||
    detailResult.parsed
      ?.data?.profileCompleteness !== 100
  ) {
    throw new Error(
      "STRUCTURED_READBACK_FAILED"
    );
  }

  console.log(
    "STEP_5: VERIFY_AUDIT"
  );

  const eventsAfterCreate =
    await db
      .collection(
        "candidateEvents"
      )
      .where(
        "candidateId",
        "==",
        createdCandidateId
      )
      .get();

  const structuredEvent =
    eventsAfterCreate.docs
      .map(
        (document) =>
          document.data()
      )
      .find(
        (event) =>
          event.type ===
            "PROFILE_UPDATED" &&
          Array.isArray(
            event.metadata
              ?.changedFields
          ) &&
          event.metadata.changedFields
            .includes("careers") &&
          event.metadata.changedFields
            .includes("education")
      );

  console.log(
    "STRUCTURED_AUDIT_FOUND:",
    Boolean(
      structuredEvent
    )
  );

  if (
    !structuredEvent ||
    structuredEvent.organizationId !==
      "jnc" ||
    structuredEvent.changedBy !==
      recruiterUid ||
    structuredEvent.metadata
      ?.synchronizedApplications !== 0
  ) {
    throw new Error(
      "STRUCTURED_AUDIT_INVALID"
    );
  }

  console.log(
    "STEP_6: REMOVE_CAREERS"
  );

  const removeCareerResult =
    await callApi(
      recruiterToken,
      `/api/b2b/candidates/${encodeURIComponent(
        createdCandidateId
      )}`,
      "PATCH",
      {
        ...baseProfile,
        careers: [],
        education,
      }
    );

  console.log(
    "REMOVE_CAREERS_STATUS:",
    removeCareerResult.status
  );

  console.log(
    "REMOVE_CAREERS_FIELDS:",
    (
      removeCareerResult.parsed
        ?.data?.changedFields || []
    ).join(",")
  );

  console.log(
    "COMPLETENESS_AFTER_REMOVE:",
    removeCareerResult.parsed
      ?.data?.candidate
      ?.profileCompleteness
  );

  if (
    removeCareerResult.status !==
      200 ||
    !removeCareerResult.parsed
      ?.success ||
    removeCareerResult.parsed
      ?.data?.changed !== true ||
    !removeCareerResult.parsed
      ?.data?.changedFields
      ?.includes("careers") ||
    removeCareerResult.parsed
      ?.data?.changedFields
      ?.includes("education") ||
    removeCareerResult.parsed
      ?.data?.candidate
      ?.careers?.length !== 0 ||
    removeCareerResult.parsed
      ?.data?.candidate
      ?.education?.length !== 1 ||
    removeCareerResult.parsed
      ?.data?.candidate
      ?.profileCompleteness !== 80
  ) {
    throw new Error(
      "CAREER_REMOVE_FAILED"
    );
  }

  console.log(
    "STEP_7: NOOP_DOES_NOT_CREATE_AUDIT"
  );

  const eventsBeforeNoop =
    await db
      .collection(
        "candidateEvents"
      )
      .where(
        "candidateId",
        "==",
        createdCandidateId
      )
      .get();

  const noopResult =
    await callApi(
      recruiterToken,
      `/api/b2b/candidates/${encodeURIComponent(
        createdCandidateId
      )}`,
      "PATCH",
      {
        ...baseProfile,
        careers: [],
        education,
      }
    );

  const eventsAfterNoop =
    await db
      .collection(
        "candidateEvents"
      )
      .where(
        "candidateId",
        "==",
        createdCandidateId
      )
      .get();

  console.log(
    "NOOP_STATUS:",
    noopResult.status
  );

  console.log(
    "NOOP_CHANGED:",
    noopResult.parsed
      ?.data?.changed
  );

  console.log(
    "AUDIT_COUNT_UNCHANGED:",
    eventsBeforeNoop.size ===
      eventsAfterNoop.size
  );

  if (
    noopResult.status !== 200 ||
    noopResult.parsed
      ?.data?.changed !== false ||
    eventsBeforeNoop.size !==
      eventsAfterNoop.size
  ) {
    throw new Error(
      "STRUCTURED_NOOP_FAILED"
    );
  }

  console.log(
    "STEP_8: CROSS_TENANT_UPDATE_BLOCKED"
  );

  const crossTenantResult =
    await callApi(
      recruiterToken,
      `/api/b2b/candidates/${encodeURIComponent(
        otherCandidateId
      )}`,
      "PATCH",
      {
        ...baseProfile,
        email:
          `phase4.attack.${marker}@example.com`,
        careers,
        education,
      }
    );

  console.log(
    "CROSS_TENANT_STATUS:",
    crossTenantResult.status
  );

  if (
    crossTenantResult.status !== 403
  ) {
    throw new Error(
      "CROSS_TENANT_STRUCTURED_UPDATE_NOT_BLOCKED"
    );
  }

  console.log(
    "STEP_9: B2C_UPDATE_BLOCKED"
  );

  const b2cResult =
    await callApi(
      b2cToken,
      `/api/b2b/candidates/${encodeURIComponent(
        createdCandidateId
      )}`,
      "PATCH",
      {
        ...baseProfile,
        careers,
        education,
      }
    );

  console.log(
    "B2C_STATUS:",
    b2cResult.status
  );

  if (
    b2cResult.status !== 403
  ) {
    throw new Error(
      "B2C_STRUCTURED_UPDATE_NOT_BLOCKED"
    );
  }

  console.log(
    "CANDIDATE_CRM_STRUCTURED_PROFILE_E2E_FINISHED"
  );
}

run()
  .catch((error) => {
    console.error(
      "CANDIDATE_CRM_STRUCTURED_PROFILE_E2E_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });