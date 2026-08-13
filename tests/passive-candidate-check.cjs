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
// Existing J&C Recruiter
// ============================================================================

const recruiterUid =
  "e2e-recruiter-jnc";

const passiveEmail =
  "e2e.passive.candidate.01@example.com";

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

// ============================================================================
// Run
// ============================================================================

async function run() {
  console.log(
    "STEP_1: CHECK_PRECONDITION"
  );

  const existingCandidate =
    await db
      .collection(
        "candidates"
      )
      .where(
        "email",
        "==",
        passiveEmail
      )
      .limit(1)
      .get();

  if (
    !existingCandidate.empty
  ) {
    throw new Error(
      "PASSIVE_TEST_CANDIDATE_ALREADY_EXISTS"
    );
  }

  try {
    await auth.getUserByEmail(
      passiveEmail
    );

    throw new Error(
      "PASSIVE_EMAIL_ALREADY_HAS_AUTH_USER"
    );
  } catch (error) {
    if (
      error?.code !==
      "auth/user-not-found"
    ) {
      throw error;
    }
  }

  console.log(
    "PRECONDITION_OK: true"
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
    "STEP_3: CREATE_PASSIVE_CANDIDATE"
  );

  const response =
    await fetch(
      "http://localhost:3000/api/b2b/candidates",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            "Bearer " +
            idToken,
        },

        body:
          JSON.stringify({
            name:
              "박패시브",

            phone:
              "010-9876-5432",

            email:
              passiveEmail,

            headline:
              "서비스센터 고객 응대 경력자",

            careerSummary:
              "서비스센터에서 고객 안내와 접수 업무를 담당한 경력자입니다.",

            skills: [
              "고객 응대",
              "전화 응대",
              "예약 관리",
            ],

            careers: [
              {
                companyName:
                  "테스트서비스",

                role:
                  "리셉션",

                period:
                  "2023.01 ~ 2025.12",

                description:
                  "내방 고객 안내, 전화 응대 및 예약 관리",
              },
            ],

            education: [
              {
                schoolName:
                  "테스트대학교",

                major:
                  "경영학과",

                degree:
                  "학사",

                period:
                  "2019.03 ~ 2023.02",
              },
            ],
          }),
      }
    );

  const responseBody =
    await response.json();

  console.log(
    "CREATE_STATUS:",
    response.status
  );

  console.log(
    "CREATE_BODY:",
    JSON.stringify(
      responseBody
    )
  );

  if (
    response.status !==
      201 ||
    !responseBody.success ||
    !responseBody.data?.candidateId
  ) {
    throw new Error(
      "PASSIVE_CANDIDATE_CREATE_FAILED"
    );
  }

  const candidateId =
    responseBody.data.candidateId;

  console.log(
    "STEP_4: VERIFY_FIRESTORE"
  );

  const candidateSnapshot =
    await db
      .collection(
        "candidates"
      )
      .doc(
        candidateId
      )
      .get();

  const profileSnapshot =
    await db
      .collection(
        "profile"
      )
      .doc(
        candidateId
      )
      .get();

  console.log(
    "CANDIDATE_EXISTS:",
    candidateSnapshot.exists
  );

  console.log(
    "PROFILE_EXISTS:",
    profileSnapshot.exists
  );

  if (
    !candidateSnapshot.exists ||
    !profileSnapshot.exists
  ) {
    throw new Error(
      "CANDIDATE_PROFILE_ATOMIC_RESULT_MISSING"
    );
  }

  const candidate =
    candidateSnapshot.data();

  const profile =
    profileSnapshot.data();

  console.log(
    "CANDIDATE_ID:",
    candidate?.candidateId
  );

  console.log(
    "DOC_ID_MATCH:",
    candidateSnapshot.id ===
      candidate?.candidateId
  );

  console.log(
    "AUTH_UID_IS_NULL:",
    candidate?.authUid ===
      null
  );

  console.log(
    "SOURCE:",
    candidate?.source
  );

  console.log(
    "ACCOUNT_STATUS:",
    candidate?.accountStatus
  );

  console.log(
    "NAME:",
    candidate?.name
  );

  console.log(
    "EMAIL:",
    candidate?.email
  );

  console.log(
    "PROFILE_CANDIDATE_ID_MATCH:",
    profile?.candidateId ===
      candidate?.candidateId
  );

  console.log(
    "SKILLS:",
    JSON.stringify(
      profile?.skills
    )
  );

  console.log(
    "CAREERS:",
    JSON.stringify(
      profile?.careers
    )
  );

  console.log(
    "EDUCATION:",
    JSON.stringify(
      profile?.education
    )
  );

  console.log(
    "EDUCATION_IS_OBJECT_ARRAY:",
    Array.isArray(
      profile?.education
    ) &&
      profile.education.length ===
        1 &&
      typeof profile.education[0] ===
        "object" &&
      profile.education[0] !==
        null &&
      profile.education[0].schoolName ===
        "테스트대학교"
  );

  console.log(
    "PROFILE_COMPLETENESS:",
    profile?.profileCompleteness
  );

  console.log(
    "STEP_5: VERIFY_NO_FIREBASE_AUTH_ACCOUNT"
  );

  let authUserExists =
    false;

  try {
    await auth.getUserByEmail(
      passiveEmail
    );

    authUserExists =
      true;
  } catch (error) {
    if (
      error?.code !==
      "auth/user-not-found"
    ) {
      throw error;
    }
  }

  console.log(
    "AUTH_USER_EXISTS:",
    authUserExists
  );

  console.log(
    "PASSIVE_CANDIDATE_E2E_FINISHED"
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