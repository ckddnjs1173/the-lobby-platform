const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs
    .readFileSync(path.join(root, relativePath), "utf8")
    .replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const registerPage = read("src/app/register/page.tsx");
const loginPage = read("src/app/login/page.tsx");
const candidatePage = read("src/app/candidate/page.tsx");
const candidatePortalService = read("src/lib/server/candidatePortalService.ts");
const jobPage = read("src/app/b2b-admin/jobs/page.tsx");
const jdComponent = read("src/components/b2b-admin/AiJdForm.tsx");
const jdClient = read("src/lib/jobDescriptionApi.ts");
const jdRoute = read("src/app/api/b2b/jobs/parse/route.ts");
const jdService = read("src/lib/server/jobDescriptionParsingService.ts");
const adminPage = read("src/app/b2b-admin/page.tsx");
const adminSlideOver = read("src/components/b2b-admin/ApplicationSlideOver.tsx");
const envValidator = read("scripts/validate-production-env.cjs");
const readinessRoute = read("src/app/api/readiness/route.ts");

console.log("STEP_1: CANDIDATE_AUTH_PROFILE_WORKFLOW");
assert(
  registerPage.includes("createUserWithEmailAndPassword") &&
    registerPage.includes("bootstrapCandidatePortal") &&
    registerPage.includes("/api/ai-parse-resume") &&
    loginPage.includes("signInWithEmailAndPassword") &&
    candidatePage.includes("onAuthStateChanged") &&
    candidatePage.includes("/login") &&
    candidatePage.includes("/register") &&
    candidatePortalService.includes('source: "B2C_SELF"') &&
    candidatePortalService.includes("authUid"),
  "CANDIDATE_AUTH_PROFILE_WORKFLOW_INCOMPLETE"
);

console.log("STEP_2: JD_INTAKE_TO_STANDARD_FORM_WORKFLOW");
assert(
  jdComponent.includes("parseJobDescriptionTextViaApi") &&
    jdComponent.includes("parseJobDescriptionFileViaApi") &&
    !jdComponent.includes("firebase/firestore") &&
    !jdComponent.includes("addDoc") &&
    jdClient.includes('"/api/b2b/jobs/parse"') &&
    jdRoute.includes("requireFirebaseUser") &&
    jdRoute.includes("requireB2BActor") &&
    jdRoute.includes("consumeRateLimit") &&
    jdRoute.includes("extractResumeTextFromFile") &&
    jdService.includes('response_format: {') &&
    jdService.includes('type: "json_schema"') &&
    jdService.includes("원문에 없는") &&
    jobPage.includes("<AiJdForm") &&
    jobPage.includes("handleAiParsed") &&
    jobPage.includes("createB2BJobViaApi"),
  "JD_STANDARDIZATION_WORKFLOW_INCOMPLETE"
);

console.log("STEP_3: ADMIN_APPLICATION_OPERATIONS_WORKFLOW");
assert(
  adminPage.includes("ApplicationTable") &&
    adminPage.includes("ApplicationKanban") &&
    adminPage.includes("ApplicationSlideOver") &&
    adminPage.includes("updateApplicationStageViaApi") &&
    adminSlideOver.includes("candidatePhone") &&
    adminSlideOver.includes("candidateEmail") &&
    adminSlideOver.includes("ApplicationOperationsPanel") &&
    adminSlideOver.includes("ApplicationHiringOutcomePanel"),
  "ADMIN_APPLICATION_WORKFLOW_INCOMPLETE"
);

console.log("STEP_4: MANUAL_COMMUNICATION_RELEASE_MODE");
const requiredKeysBlock = envValidator.match(/const requiredKeys = \[[\s\S]*?\];/)?.[0] || "";
assert(
  envValidator.includes("COMMUNICATION_MODE=MANUAL") &&
    !requiredKeysBlock.includes("RESEND_API_KEY") &&
    !requiredKeysBlock.includes("COMMUNICATION_FROM_EMAIL") &&
    !requiredKeysBlock.includes("COMMUNICATION_EMAIL_PROVIDER") &&
    readinessRoute.includes('communicationMode: emailAutomation ? "RESEND" : "MANUAL"') &&
    readinessRoute.includes("aiResumeAndJobParsing"),
  "MANUAL_COMMUNICATION_RELEASE_MODE_INCOMPLETE"
);

console.log("CORE_WORKFLOWS_RELEASE_CHECK_PASSED");
