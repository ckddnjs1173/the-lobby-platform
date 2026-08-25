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
    globalPool.includes('data.source === "B2C_SELF"') &&
    globalPool.includes('data.accountStatus === "ACTIVE"') &&
    globalPool.includes("data.talentPoolOptIn === true") &&
    globalPool.includes("GLOBAL_SCAN_LIMIT") &&
    tenantPool.includes('.where("source", "==", "B2B_DIRECT")') &&
    tenantPool.includes('.where("authUid", "==", null)'),
  "GLOBAL_AND_TENANT_TALENT_POOLS_MUST_REMAIN_SEPARATE"
);

console.log("STEP_2: CANDIDATE_PREFERENCES_AND_CONSENT");
const preferenceService = read("src/lib/server/candidatePreferenceService.ts");
const preferencePage = read("src/app/talent-pool/settings/page.tsx");
const registrationConsentPage = read("src/app/register/consent/page.tsx");
const registrationConsentRoute = read("src/app/api/public/registration-consent/route.ts");
const proxy = read("src/proxy.ts");
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
    preferencePage.includes('href="/terms"') &&
    registrationConsentPage.includes("개인정보 수집·이용 동의") &&
    registrationConsentPage.includes("이용약관 동의") &&
    registrationConsentRoute.includes("response.cookies.set") &&
    registrationConsentRoute.includes("httpOnly: true") &&
    proxy.includes('matcher: ["/register"]'),
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
const jobDetailPage = read("src/app/jobs/[jobId]/page.tsx");
const jobDetailsService = read("src/lib/server/jobOperationalDetailsService.ts");
const placementE2E = read("tests/candidate-multi-placement-check.cjs");
const activityE2E = read("tests/application-activity-check.cjs");
const authorizationStageE2E = read("tests/authorization-stage-check.cjs");
const robots = read("src/app/robots.ts");
const sitemap = read("src/app/sitemap.ts");
assert(
  publicJobService.includes("workSchedule") &&
    publicJobService.includes("applicationDeadline") &&
    publicJobService.includes("isPubliclyActiveJob") &&
    publicJobService.includes('timeZone: "Asia/Seoul"') &&
    publicJobService.includes("deadline >= todayInSeoul()") &&
    publicJobService.includes("data.isTestData === true") &&
    placementE2E.includes("isTestData: true") &&
    placementE2E.includes('status: "DRAFT"') &&
    placementE2E.includes("CLEANUP_ATTEMPT_FAILED") &&
    placementE2E.includes("CLEANUP_FATAL") &&
    activityE2E.includes("e2e-application-activity-") &&
    activityE2E.includes("isTestData: true") &&
    activityE2E.includes("CLEANUP_FINISHED") &&
    !activityE2E.includes("hansung-yuseong-reception-20260813") &&
    !activityE2E.includes("xnHT4sEYN2wFjOZIEIcP") &&
    authorizationStageE2E.includes("e2e-authorization-stage-") &&
    authorizationStageE2E.includes("isTestData: true") &&
    authorizationStageE2E.includes("UNAUTHORIZED_STAGE_MUTATION_OCCURRED") &&
    authorizationStageE2E.includes("CLEANUP_FINISHED") &&
    !authorizationStageE2E.includes("hansung-yuseong-reception-20260813") &&
    !authorizationStageE2E.includes("xnHT4sEYN2wFjOZIEIcP__") &&
    jobDetailsService.includes("workplaceName") &&
    jobDetailsService.includes("employingCompany") &&
    jobDetailsService.includes("salaryBase") &&
    jobDetailsService.includes("salaryIncentive") &&
    jobDetailsService.includes("interviewSchedule") &&
    jobDetailsService.includes("expectedStartDate") &&
    jobDetailsService.includes("benefits") &&
    jobDetailPage.includes("근무·고용 핵심조건") &&
    jobDetailPage.includes("J&amp;C Recruiting") &&
    !jobDetailPage.includes("The Lobby Curation") &&
    jobDetailLayout.includes('"@type": "JobPosting"') &&
    jobDetailLayout.includes("validThrough") &&
    jobDetailLayout.includes("schemaEmploymentType") &&
    robots.includes("sitemap.xml") &&
    sitemap.includes("listPublicJobs") &&
    sitemap.includes("await connection()") &&
    sitemap.includes("serving static entries"),
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

console.log("STEP_7: PRIVACY_MINIMAL_ACQUISITION_ANALYTICS");
const eventService = read("src/lib/server/publicEventService.ts");
const eventRoute = read("src/app/api/public/events/route.ts");
const acquisitionService = read("src/lib/server/acquisitionAnalyticsService.ts");
assert(
  eventService.includes("eventName") &&
    eventService.includes("path") &&
    !eventService.includes("email") &&
    !eventService.includes("uid") &&
    eventService.includes('PUBLIC_ANALYTICS_DISABLED === "true"') &&
    eventRoute.includes('new Set(["page_view"])') &&
    acquisitionService.includes('actor.role !== "ADMIN"') &&
    acquisitionService.includes("profileCreated") &&
    acquisitionService.includes("applicationsSubmitted"),
  "ACQUISITION_ANALYTICS_PRIVACY_BOUNDARY_INCOMPLETE"
);

console.log("STEP_8: PERMANENT_BROWSER_GATE");
const browserWorkflow = read(".github/workflows/browser-e2e.yml");
const browserSpec = read("tests/browser/public-launch.spec.cjs");
assert(
  browserWorkflow.includes("npx playwright test") &&
    browserWorkflow.includes("pull_request") &&
    browserSpec.includes("/robots.txt") &&
    browserSpec.includes("JobPosting") &&
    browserSpec.includes("explicit registration consent") &&
    browserSpec.includes("public inventory contains only current publishable positions") &&
    browserSpec.includes("PUBLIC_JOB_AUDIT") &&
    browserSpec.includes("toBeGreaterThan(0)") &&
    browserSpec.includes("Expired OPEN job leaked publicly") &&
    browserSpec.includes("viewport: { width: 390, height: 844 }") &&
    browserSpec.includes("expectNoHorizontalOverflow"),
  "PERMANENT_BROWSER_GATE_INCOMPLETE"
);

console.log("LAUNCH_READINESS_CHECK_PASSED");
