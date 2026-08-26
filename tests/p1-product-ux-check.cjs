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

console.log("P1_PRODUCT_UX_CHECK_PASSED");
