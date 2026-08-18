const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs
    .readFileSync(
      path.join(root, relativePath),
      "utf8"
    )
    .replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const service = read(
  "src/lib/server/candidatePortalService.ts"
);
const profileRoute = read(
  "src/app/api/candidate/me/route.ts"
);
const applicationsRoute = read(
  "src/app/api/candidate/applications/route.ts"
);
const client = read(
  "src/lib/candidatePortalApi.ts"
);
const portalTypes = read(
  "src/lib/candidatePortalTypes.ts"
);
const registerPage = read(
  "src/app/register/page.tsx"
);
const loginPage = read(
  "src/app/login/page.tsx"
);
const portalPage = read(
  "src/app/candidate/page.tsx"
);
const jobsPage = read(
  "src/app/jobs/page.tsx"
);
const header = read(
  "src/components/candidate/CandidateHeader.tsx"
);

console.log(
  "STEP_1: ATOMIC_CANDIDATE_BOOTSTRAP"
);

assert(
  service.includes(
    'collection("candidateAuthLinks")'
  ) &&
    service.includes(
      "db.runTransaction("
    ) &&
    service.includes(
      'source: "B2C_SELF"'
    ) &&
    service.includes(
      "transaction.set(\n        candidateRef"
    ) &&
    service.includes(
      "transaction.set(\n        profileRef"
    ) &&
    service.includes(
      "transaction.set(\n        linkRef"
    ),
  "CANDIDATE_BOOTSTRAP_MUST_BE_ATOMIC"
);

assert(
  service.includes(
    "normalizeAuthenticatedEmail("
  ) &&
    profileRoute.includes(
      "authenticatedUser.email"
    ) &&
    !service.includes(
      "rawInput.email"
    ),
  "CANDIDATE_EMAIL_MUST_COME_FROM_AUTH_TOKEN"
);

assert(
  service.includes(
    'where("authUid", "==", authUid)'
  ) &&
    service.includes(
      "Candidate auth link self-heal"
    ),
  "LEGACY_AUTH_UID_FALLBACK_MISSING"
);

console.log(
  "STEP_2: SERVER_AUTHORIZED_SELF_SERVICE"
);

for (const route of [
  profileRoute,
  applicationsRoute,
]) {
  const authIndex =
    route.indexOf("requireFirebaseUser");
  const serviceIndex =
    route.indexOf("CandidatePortal");

  assert(
    authIndex >= 0 &&
      serviceIndex >= 0,
    "CANDIDATE_PORTAL_ROUTE_AUTH_MISSING"
  );
}

assert(
  client.includes(
    "Authorization:"
  ) &&
    client.includes(
      "fetchCandidatePortalApplications"
    ) &&
    client.includes(
      "updateCandidatePortalProfileViaApi"
    ),
  "CANDIDATE_PORTAL_CLIENT_API_MISSING"
);

console.log(
  "STEP_3: REGISTRATION_NO_DIRECT_PROFILE_WRITES"
);

assert(
  registerPage.includes(
    "bootstrapCandidateProfileViaApi"
  ) &&
    !registerPage.includes(
      'from "firebase/firestore"'
    ) &&
    !registerPage.includes("setDoc(") &&
    !registerPage.includes("serverTimestamp("),
  "REGISTER_PAGE_MUST_NOT_DIRECTLY_WRITE_FIRESTORE"
);

assert(
  registerPage.includes(
    "이름, 연락처, 이메일은 필수 입력 항목입니다"
  ) &&
    registerPage.includes(
      "hasAuthenticatedAccount"
    ) &&
    registerPage.includes(
      "직접 검토해 저장하세요"
    ),
  "REGISTRATION_RECOVERY_OR_MANUAL_PATH_MISSING"
);

console.log(
  "STEP_4: CANDIDATE_PORTAL_EXPERIENCE"
);

assert(
  loginPage.includes(
    "signInWithEmailAndPassword"
  ) &&
    loginPage.includes(
      "consumeCandidateReturnPath"
    ) &&
    loginPage.includes(
      '|| "/candidate"'
    ) &&
    loginPage.includes(
      "fetchCandidatePortalProfile"
    ),
  "CANDIDATE_LOGIN_FLOW_MISSING"
);

assert(
  portalPage.includes(
    "지원현황"
  ) &&
    portalPage.includes(
      "nextInterview"
    ) &&
    portalPage.includes(
      "updateCandidatePortalProfileViaApi"
    ) &&
    portalPage.includes(
      "지원 취소"
    ),
  "CANDIDATE_DASHBOARD_MISSING"
);

assert(
  portalTypes.includes(
    "plannedStartDate: string | null"
  ) &&
    service.includes(
      "plannedStartDate"
    ),
  "CANDIDATE_PLANNED_START_DATE_CONTRACT_MISSING"
);

assert(
  header.includes(
    'href="/candidate"'
  ) &&
    header.includes(
      "signOut(auth)"
    ),
  "CANDIDATE_NAVIGATION_MISSING"
);

console.log(
  "STEP_5: APPLICATION_STATE_AND_PRIVACY"
);

assert(
  jobsPage.includes(
    "fetchCandidatePortalApplications"
  ) &&
    jobsPage.includes(
      "applications.map("
    ) &&
    jobsPage.includes(
      "application.jobId"
    ),
  "APPLIED_JOB_STATE_RESTORE_MISSING"
);

assert(
  service.includes(
    "jobData?.displayCompany"
  ) &&
    service.includes(
      '"채용 고객사"'
    ) &&
    !portalPage.includes(
      "hiringOutcome.note"
    ),
  "CANDIDATE_FACING_APPLICATION_PRIVACY_MISSING"
);

assert(
  applicationsRoute.includes(
    "enforcePublicCompanyNames"
  ) &&
    applicationsRoute.includes(
      "displayCompany"
    ) &&
    applicationsRoute.includes(
      '"채용 고객사"'
    ) &&
    !applicationsRoute.includes(
      "data()?.company"
    ),
  "CANDIDATE_COMPANY_FALLBACK_MUST_NOT_EXPOSE_INTERNAL_COMPANY"
);

assert(
  service.includes(
    '"PROFILE_UPDATED" satisfies EventType'
  ) &&
    service.includes(
      "candidateSnapshot"
    ),
  "SELF_SERVICE_PROFILE_SYNC_AUDIT_MISSING"
);

console.log(
  "PHASE8_CANDIDATE_PORTAL_CHECK_PASSED"
);