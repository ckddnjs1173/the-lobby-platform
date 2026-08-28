const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("STEP_1: CANDIDATE_NEXT_ACTION");
const nextAction = read("src/lib/candidateNextAction.ts");
const nextActionPanel = read("src/components/candidate/CandidateNextActionPanel.tsx");
const candidateLayout = read("src/app/candidate/layout.tsx");
assert(
  nextAction.includes("getCandidateNextAction") &&
    nextAction.includes("const stage = application.stage") &&
    nextAction.includes('stage === "INTERVIEW"') &&
    nextAction.includes("application.nextInterview") &&
    nextAction.includes("application.plannedStartDate") &&
    nextAction.includes("면접 일정이 등록되면 Candidate Portal에 표시됩니다") &&
    nextActionPanel.includes("지원 건별 다음 안내") &&
    nextActionPanel.includes("확정되지 않은 일정이나 처리 기한은 임의로 안내하지 않습니다") &&
    nextActionPanel.includes("getCandidateNextAction") &&
    candidateLayout.includes("CandidateNextActionPanel") &&
    !nextAction.includes("24시간") &&
    !nextAction.includes("영업일"),
  "CANDIDATE_NEXT_ACTION_MUST_USE_REAL_STAGE_DATA_WITHOUT_SLA_INVENTION"
);

console.log("STEP_2: EXPLAINABLE_RULE_MATCH");
const matchSignals = read("src/lib/talentMatchSignals.ts");
const talentPoolPage = read("src/app/b2b-admin/talent-pool/page.tsx");
assert(
  matchSignals.includes("desiredJob") &&
    matchSignals.includes("desiredLocation") &&
    matchSignals.includes("desiredEmploymentType") &&
    matchSignals.includes('candidate.jobSearchStatus === "ACTIVE"') &&
    matchSignals.includes("candidate.availableFrom.trim()") &&
    matchSignals.includes("희망직무 일치") &&
    matchSignals.includes("희망지역 일치") &&
    matchSignals.includes("고용형태 일치") &&
    talentPoolPage.includes("buildTalentMatchSignals") &&
    talentPoolPage.includes("포지션 기준 빠른 매칭 신호") &&
    talentPoolPage.includes("AI 점수가 아니라") &&
    talentPoolPage.includes("자동 지원되지 않으며") &&
    talentPoolPage.includes("후보자 수락 절차"),
  "TALENT_POOL_MATCHING_MUST_REMAIN_EXPLAINABLE_AND_CONSENT_SAFE"
);

console.log("STEP_3: SPECIALIST_CAREER_GUIDES");
const careerData = read("src/lib/receptionCareerGuide.ts");
const careerHub = read("src/app/careers/page.tsx");
const careerDetail = read("src/app/careers/[slug]/page.tsx");
const sitemap = read("src/app/sitemap.ts");
const careerBrowser = read("tests/browser/career-guide.spec.cjs");

for (const slug of [
  "corporate-reception",
  "automotive-reception",
  "hotel-front",
  "medical-reception",
  "vip-lounge",
]) {
  assert(
    careerData.includes(`id: "${slug}"`) &&
      careerHub.includes('href={`/careers/${track.id}`}') &&
      careerBrowser.includes(slug),
    `CAREER_GUIDE_ROUTE_INCOMPLETE:${slug}`
  );
}

assert(
  careerDetail.includes("generateStaticParams") &&
    careerDetail.includes("generateMetadata") &&
    careerDetail.includes("getReceptionCareerTrack") &&
    careerDetail.includes("Profile Evidence") &&
    careerDetail.includes("Interview Prep") &&
    careerDetail.includes("실제 급여·근무시간·고용형태·업무범위") &&
    sitemap.includes("careerTracks.map") &&
    careerBrowser.includes("390") &&
    careerBrowser.includes("10.5px readability floor"),
  "CAREER_GUIDES_MUST_HAVE_DETAIL_SEO_DISCOVERY_AND_MOBILE_QA"
);

console.log("STEP_4: UI_RESILIENCE_AND_ACCESSIBILITY");
const publicHeader = read("src/components/public/PublicHeader.tsx");
const candidateHeader = read("src/components/candidate/CandidateHeader.tsx");
const jobsPage = read("src/app/jobs/page.tsx");
const acquisitionPage = read("src/app/b2b-admin/acquisition/page.tsx");
const uiBrowser = read("tests/browser/ui-quality.spec.cjs");

assert(
  publicHeader.includes('const MOBILE_NAV_ID = "public-mobile-navigation"') &&
    publicHeader.includes("aria-controls={MOBILE_NAV_ID}") &&
    publicHeader.includes('aria-current={active ? "page" : undefined}') &&
    publicHeader.includes('event.key === "Escape"') &&
    publicHeader.includes('text-[11px] font-semibold uppercase') &&
    !publicHeader.includes("text-[8px]") &&
    !publicHeader.includes("text-[8.5px]"),
  "PUBLIC_NAVIGATION_MUST_EXPOSE_CONTROLLED_CURRENT_AND_READABLE_STATE"
);

assert(
  candidateHeader.includes('const MOBILE_NAV_ID = "candidate-mobile-navigation"') &&
    candidateHeader.includes("aria-controls={MOBILE_NAV_ID}") &&
    candidateHeader.includes("aria-current=") &&
    candidateHeader.includes('event.key === "Escape"') &&
    !candidateHeader.includes("text-[8px]") &&
    !candidateHeader.includes("text-[8.5px]"),
  "CANDIDATE_NAVIGATION_MUST_EXPOSE_CONTROLLED_CURRENT_AND_READABLE_STATE"
);

assert(
  jobsPage.includes("const [loadError, setLoadError]") &&
    jobsPage.includes("const [loadAttempt, setLoadAttempt]") &&
    jobsPage.includes('role="alert"') &&
    jobsPage.includes("채용공고를 불러오지 못했습니다.") &&
    jobsPage.includes("다시 불러오기") &&
    jobsPage.includes("aria-pressed={active}") &&
    jobsPage.includes('aria-live="polite"') &&
    !jobsPage.includes("text-[9px]"),
  "PUBLIC_JOBS_MUST_SEPARATE_ERROR_EMPTY_AND_FILTER_STATES"
);

assert(
  acquisitionPage.includes("const [loadError, setLoadError]") &&
    acquisitionPage.includes("const [reloadKey, setReloadKey]") &&
    acquisitionPage.includes('role="alert"') &&
    acquisitionPage.includes("다시 불러오기") &&
    acquisitionPage.includes('role="status"'),
  "ACQUISITION_ANALYTICS_MUST_SEPARATE_ERROR_AND_EMPTY_STATES"
);

assert(
  uiBrowser.includes('aria-controls", "public-mobile-navigation"') &&
    uiBrowser.includes('page.route("**/api/public/jobs"') &&
    uiBrowser.includes("status: 503") &&
    uiBrowser.includes("조건에 맞는 공고가 없습니다.") &&
    uiBrowser.includes("채용공고를 불러오지 못했습니다.") &&
    uiBrowser.includes('aria-pressed", "true"') &&
    uiBrowser.includes("10.5"),
  "UI_RESILIENCE_MUST_HAVE_BROWSER_REGRESSION_COVERAGE"
);

console.log("STEP_5: INTERNAL_WORKSPACE_RESILIENCE");
const candidatePortal = read("src/app/candidate/page.tsx");
const savedJobsPage = read("src/app/candidate/saved-jobs/page.tsx");
const opportunitiesPage = read("src/app/candidate/opportunities/page.tsx");
const b2bLayout = read("src/app/b2b-admin/layout.tsx");
const b2bPipeline = read("src/app/b2b-admin/page.tsx");
const candidatePool = read("src/app/b2b-admin/candidates/page.tsx");
const b2bJobs = read("src/app/b2b-admin/jobs/page.tsx");
const globalTalentPool = read("src/app/b2b-admin/talent-pool/page.tsx");
const jobDetails = read("src/app/b2b-admin/job-details/page.tsx");
const recruitingAnalytics = read("src/app/b2b-admin/analytics/page.tsx");

assert(
  candidatePortal.includes("const [loadError, setLoadError]") &&
    candidatePortal.includes('role="alert"') &&
    candidatePortal.includes("다시 불러오기") &&
    !candidatePortal.includes("추천 채용 보기") &&
    savedJobsPage.includes("const [loadError, setLoadError]") &&
    savedJobsPage.includes("const [reloadKey, setReloadKey]") &&
    savedJobsPage.includes('role="alert"') &&
    opportunitiesPage.includes("const [loadError, setLoadError]") &&
    opportunitiesPage.includes("const [reloadKey, setReloadKey]") &&
    opportunitiesPage.includes('role="alert"'),
  "CANDIDATE_INTERNAL_SURFACES_MUST_SEPARATE_LOAD_FAILURE_FROM_EMPTY_STATE"
);

assert(
  b2bLayout.includes('aria-controls="b2b-mobile-navigation"') &&
    b2bLayout.includes('id="b2b-mobile-navigation"') &&
    b2bLayout.includes('aria-current={item.active ? "page" : undefined}') &&
    b2bLayout.includes('event.key === "Escape"') &&
    !b2bLayout.includes("text-[9px]"),
  "B2B_NAVIGATION_MUST_EXPOSE_CONTROLLED_CURRENT_AND_READABLE_STATE"
);

assert(
  b2bPipeline.includes("const [loadError, setLoadError]") &&
    b2bPipeline.includes('aria-label="지원 단계 필터"') &&
    b2bPipeline.includes("aria-pressed={viewMode === mode}") &&
    candidatePool.includes("const [loadError, setLoadError]") &&
    b2bJobs.includes("const [loadError, setLoadError]") &&
    globalTalentPool.includes("const [poolError, setPoolError]") &&
    globalTalentPool.includes("const [jobsLoadError, setJobsLoadError]"),
  "B2B_WORKSPACES_MUST_SEPARATE_API_FAILURE_FROM_EMPTY_DATA"
);

assert(
  jobDetails.includes("const [detailsError, setDetailsError]") &&
    jobDetails.includes("setForm(EMPTY);") &&
    jobDetails.includes("setBenefitsText(\"\");") &&
    jobDetails.includes('role="alert"') &&
    jobDetails.includes("setDetailsReloadKey") &&
    !recruitingAnalytics.includes("text-[9px]"),
  "JOB_DETAILS_MUST_CLEAR_STALE_FORM_BEFORE_LOADING_ANOTHER_POSITION"
);

console.log("P1_PRODUCT_UX_CHECK_PASSED");
