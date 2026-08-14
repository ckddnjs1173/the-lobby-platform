const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const policy = read(
  "src/lib/server/applicationStagePolicy.ts"
);
const service = read(
  "src/lib/server/applicationService.ts"
);
const slideOver = read(
  "src/components/b2b-admin/ApplicationSlideOver.tsx"
);
const table = read(
  "src/components/b2b-admin/ApplicationTable.tsx"
);

console.log("STEP_1: GUARDED_HIGH_RISK_STAGES");

assert(
  policy.includes("INTERVIEW_SCHEDULE_REQUIRED") &&
    policy.includes('toStage ===\n    "INTERVIEW"'),
  "DIRECT_INTERVIEW_ENTRY_GUARD_MISSING"
);
assert(
  policy.includes("OFFER:") &&
    policy.includes('"INTERVIEW"'),
  "OFFER_ENTRY_POLICY_MISSING"
);
assert(
  policy.includes("HIRED:") &&
    policy.includes('"OFFER"'),
  "HIRED_ENTRY_POLICY_MISSING"
);

console.log("STEP_2: REOPEN_AND_BACKWARD_GUARDS");

assert(
  policy.includes("TERMINAL_STAGE_REOPEN_DENIED"),
  "TERMINAL_REOPEN_GUARD_MISSING"
);
assert(
  policy.includes("STAGE_CHANGE_REASON_REQUIRED"),
  "BACKWARD_REASON_GUARD_MISSING"
);
assert(
  policy.includes("ADMIN_OVERRIDE"),
  "ADMIN_OVERRIDE_POLICY_MISSING"
);

console.log("STEP_3: POLICY_ENFORCED_INSIDE_STAGE_TRANSACTION");

const decisionIndex =
  service.indexOf("evaluateApplicationStageTransition");
const updateIndex =
  service.indexOf("transaction.update(\n        applicationRef");

assert(
  decisionIndex >= 0,
  "APPLICATION_SERVICE_POLICY_CALL_MISSING"
);
assert(
  updateIndex >= 0 &&
    decisionIndex < updateIndex,
  "STAGE_POLICY_MUST_RUN_BEFORE_TRANSACTION_UPDATE"
);
assert(
  service.includes("transitionKind"),
  "STAGE_TRANSITION_AUDIT_METADATA_MISSING"
);

console.log("STEP_4: UI_PREVENTS_DIRECT_INTERVIEW_ENTRY");

assert(
  slideOver.includes("단계 변경 메모") &&
    slideOver.includes("noteText.trim() || undefined"),
  "STAGE_REASON_UI_MISSING"
);
assert(
  slideOver.includes('newStage === "INTERVIEW"') &&
    slideOver.includes("면접 단계는 Stage 버튼으로 직접 변경하지 않습니다"),
  "DETAIL_DIRECT_INTERVIEW_GUARD_MISSING"
);
assert(
  table.includes('stage === "INTERVIEW"') &&
    table.includes("일정 확정 필요"),
  "TABLE_DIRECT_INTERVIEW_GUARD_MISSING"
);

console.log("PHASE6_STAGE_POLICY_CHECK_PASSED");
