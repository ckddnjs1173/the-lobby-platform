const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("STEP_1: GLOBAL_TALENT_POOL_BOUNDARY");
const globalPool = read("src/lib/server/globalTalentPoolService.ts");
const tenantPool = read("src/lib/server/candidatePoolService.ts");
assert(
  globalPool.includes('actor.role !== "ADMIN"') &&
    globalPool.includes('.where("source", "==", "B2C_SELF")') &&
    globalPool.includes('.where("talentPoolOptIn", "==", true)') &&
    tenantPool.includes('.where("source", "==", "B2B_DIRECT")') &&
    tenantPool.includes('.where("authUid", "==", null)'),
  "GLOBAL_AND_TENANT_TALENT_POOLS_MUST_REMAIN_SEPARATE"
);

console.log("STEP_2: CANDIDATE_PREFERENCES_AND_CONSENT");
const preferenceService = read("src/lib/server/candidatePreferenceService.ts");
const preferencePage = read("src/app/talent-pool/settings/page.tsx");
assert(
  preferenceService.includes("desiredJob") &&
    preferenceService.includes("desiredLocation") &&
    preferenceService.includes("desiredSalary") &&
    preferenceService.includes("desiredEmploymentType") &&
    preferenceService.includes("jobSearchStatus") &&
    preferenceService.includes("availableFrom") &&
    preferenceService.includes("talentPoolOptIn") &&
    preferenceService.includes("candidateConsents") &&
    preferencePage.includes('href="/privacy"') &&
    preferencePage.includes('href="/terms"'),
  "CANDIDATE_PREFERENCE_CONSENT_WORKFLOW_INCOMPLETE"
);

console.log("STEP_3: CONSENT_SAFE_TALENT_OPPORTUNITY");
const opportunityService = read("src/lib/server/talentOpportunityService.ts");
const opportunityPage = read("src/app/candidate/opportunities/page.tsx");
assert(
  opportunityService.includes('status: "PROPOSED"') &&
    opportunityService.includes('decisionInput === "ACCEPT"') &&
    opportunityService.includes('source: "HEADHUNTING"') &&
    opportunityService.includes("candidate.talentPoolOptIn !== true") &&
    opportunityPage.includes("수락하기 전에는 실제 지원 내역이 생성되지 않습니다") &&
    opportunityPage.includes("제안 수락하고 지원 진행"),
  "TALENT_OPPORTUNITY_MUST_REQUIRE_CANDIDATE_ACCEPTANCE"
);

console.log("STEP_4: SAVED_JOBS_RETENTION_LOOP");
const savedService = read("src/lib/server/candidateSavedJobService.ts");
const saveButton = read("src/components/candidate/SaveJobFloatingButton.tsx");
const savedPage = read("src/app/candidate/saved-jobs/page.tsx");
assert(
  savedService.includes("candidateSavedJobs") &&
    savedService.includes("getPublicJob") &&
    saveButton.includes("saveCandidateJobViaApi") &&
    saveButton.includes("removeCandidateSavedJobViaApi") &&
    savedPage.includes("관심공고"),
  "SAVED_JOB_WORKFLOW_INCOMPLETE"
);

console.log("STEP_5: JOB_QUALITY_AND_SEARCH_DISCOVERY");
const publicJobService = read("src/lib/server/publicJobService.ts");
const jobDetailLayout = read("src/app/jobs/[jobId]/layout.tsx");
const jobDetailsService = read("src/lib/server/jobOperationalDetailsService.ts");
const robots = read("src/app/robots.ts");
const sitemap = read("src/app/sitemap.ts");
assert(
  publicJobService.includes("workSchedule") &&
    publicJobService.includes("applicationDeadline") &&
    jobDetailsService.includes("nearbyTransit") &&
    jobDetailsService.includes("benefits") &&
    jobDetailLayout.includes('"@type": "JobPosting"') &&
    jobDetailLayout.includes("validThrough") &&
    robots.includes("sitemap.xml") &&
    sitemap.includes("listPublicJobs"),
  "JOB_QUALITY_OR_SEARCH_DISCOVERY_INCOMPLETE"
);

console.log("STEP_6: LEGAL_AND_PRIVACY_DISCLOSURE");
const privacyPage = read("src/app/privacy/page.tsx");
const termsPage = read("src/app/terms/page.tsx");
assert(
  privacyPage.includes("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL") &&
    privacyPage.includes("인재풀 공개") &&
    termsPage.includes("The Lobby 이용약관") &&
    termsPage.includes('href="/privacy"'),
  "LEGAL_DISCLOSURE_SCAFFOLD_INCOMPLETE"
);

console.log("STEP_7: PERMANENT_BROWSER_GATE");
const browserWorkflow = read(".github/workflows/browser-e2e.yml");
const browserSpec = read("tests/browser/public-launch.spec.cjs");
assert(
  browserWorkflow.includes("npx playwright test") &&
    browserWorkflow.includes("pull_request") &&
    browserSpec.includes("/robots.txt") &&
    browserSpec.includes("JobPosting"),
  "PERMANENT_BROWSER_GATE_INCOMPLETE"
);

console.log("LAUNCH_READINESS_CHECK_PASSED");
