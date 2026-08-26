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
    nextAction.includes('application.stage === "INTERVIEW"') &&
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

console.log("P1_PRODUCT_UX_CHECK_PASSED");
