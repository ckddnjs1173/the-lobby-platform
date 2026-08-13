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

const auth =
  getAuth();

const db =
  getFirestore();

// ============================================================================
// Existing E2E Actors
// ============================================================================

const recruiterUid =
  "e2e-recruiter-jnc";

const candidateUid =
  "AywBaN2alaX56v3h8FRFd3M9FD02";

// ============================================================================
// Attack Test Data
// ============================================================================

const spoofEmail =
  "e2e.passive.spoof.01@example.com";

const candidateAttackEmail =
  "e2e.passive.candidate.attack.01@example.com";

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

async function callCreateCandidate(
  idToken,
  body
) {
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
          JSON.stringify(
            body
          ),
      }
    );

  return {
    status:
      response.status,

    body:
      await response.text(),
  };
}

async function candidateExistsByEmail(
  email
) {
  const snapshot =
    await db
      .collection(
        "candidates"
      )
      .where(
        "email",
        "==",
        email
      )
      .limit(1)
      .get();

  return !snapshot.empty;
}

// ============================================================================
// Run
// ============================================================================

async function run() {
  // --------------------------------------------------------------------------
  // 1. Recruiter attempts to inject server-owned fields
  // --------------------------------------------------------------------------

  console.log(
    "STEP_1: SERVER_FIELD_SPOOF_ATTACK"
  );

  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );

  const spoofResult =
    await callCreateCandidate(
      recruiterToken,
      {
        candidateId:
          "attacker-controlled-candidate-id",

        authUid:
          candidateUid,

        source:
          "B2C_SELF",

        accountStatus:
          "SUSPENDED",

        organizationId:
          "attacker-org",

        createdBy:
          "fake-admin",

        actorRole:
          "ADMIN",

        actorOrganizationId:
          "attacker-org",

        name:
          "위조후보자",

        phone:
          "010-1111-9999",

        email:
          spoofEmail,

        headline:
          "위조 테스트",

        careerSummary:
          "서버 전용 필드 위조 공격 테스트",

        skills: [
          "고객 응대",
        ],

        careers: [],

        education: [],
      }
    );

  console.log(
    "SPOOF_STATUS:",
    spoofResult.status
  );

  console.log(
    "SPOOF_BODY:",
    spoofResult.body
  );

  const spoofCandidateExists =
    await candidateExistsByEmail(
      spoofEmail
    );

  console.log(
    "SPOOF_CANDIDATE_EXISTS:",
    spoofCandidateExists
  );

  // --------------------------------------------------------------------------
  // 2. Normal Candidate attempts to call B2B Candidate API
  // --------------------------------------------------------------------------

  console.log(
    "STEP_2: B2C_CANDIDATE_B2B_API_ATTACK"
  );

  const candidateToken =
    await exchangeCustomToken(
      candidateUid
    );

  const candidateAttackResult =
    await callCreateCandidate(
      candidateToken,
      {
        name:
          "권한없는후보자",

        phone:
          "010-2222-9999",

        email:
          candidateAttackEmail,

        headline:
          "권한 공격 테스트",

        careerSummary:
          "B2C Candidate가 B2B API를 호출하는 테스트",

        skills: [],

        careers: [],

        education: [],
      }
    );

  console.log(
    "CANDIDATE_ATTACK_STATUS:",
    candidateAttackResult.status
  );

  console.log(
    "CANDIDATE_ATTACK_BODY:",
    candidateAttackResult.body
  );

  const candidateAttackExists =
    await candidateExistsByEmail(
      candidateAttackEmail
    );

  console.log(
    "CANDIDATE_ATTACK_RECORD_EXISTS:",
    candidateAttackExists
  );

  // --------------------------------------------------------------------------
  // 3. Assertions
  // --------------------------------------------------------------------------

  console.log(
    "STEP_3: SECURITY_ASSERTIONS"
  );

  const spoofWasRejected =
    spoofResult.status >= 400 &&
    spoofResult.status < 500;

  const candidateWasRejected =
    candidateAttackResult.status ===
      403;

  const noUnauthorizedRecords =
    !spoofCandidateExists &&
    !candidateAttackExists;

  console.log(
    "SPOOF_WAS_REJECTED:",
    spoofWasRejected
  );

  console.log(
    "B2C_CALL_WAS_REJECTED:",
    candidateWasRejected
  );

  console.log(
    "NO_UNAUTHORIZED_RECORDS:",
    noUnauthorizedRecords
  );

  if (
    !spoofWasRejected ||
    !candidateWasRejected ||
    !noUnauthorizedRecords
  ) {
    throw new Error(
      "PASSIVE_CANDIDATE_SECURITY_CHECK_FAILED"
    );
  }

  console.log(
    "PASSIVE_CANDIDATE_SECURITY_CHECK_FINISHED"
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