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

const service = read(
  "src/lib/server/hiringOutcomeService.ts"
);
const route = read(
  "src/app/api/b2b/applications/[applicationId]/outcome/route.ts"
);
const clientApi = read(
  "src/lib/hiringOutcomeApi.ts"
);
const panel = read(
  "src/components/b2b-admin/ApplicationHiringOutcomePanel.tsx"
);
const listService = read(
  "src/lib/server/applicationListService.ts"
);
const activityService = read(
  "src/lib/server/applicationActivityService.ts"
);
const activityPanel = read(
  "src/components/b2b-admin/ApplicationActivityPanel.tsx"
);

console.log("STEP_1: ATOMIC_HIRING_OUTCOME_SERVICE");

assert(
  service.includes("db.runTransaction"),
  "HIRING_OUTCOME_TRANSACTION_MISSING"
);
assert(
  service.includes('status === "HIRED"') &&
    service.includes('currentStage !== "OFFER"'),
  "HIRED_OFFER_GUARD_MISSING"
);
assert(
  service.includes("HIRING_OUTCOME_NOTE_REQUIRED"),
  "REJECTED_REASON_GUARD_MISSING"
);
assert(
  service.includes("TENANT_ACCESS_DENIED"),
  "HIRING_OUTCOME_TENANT_GUARD_MISSING"
);
assert(
  service.includes("hiringOutcome:") &&
    service.includes("decidedBy:") &&
    service.includes("plannedStartDate"),
  "HIRING_OUTCOME_METADATA_MISSING"
);
assert(
  service.includes('type:\n            "HIRING_OUTCOME_RECORDED"') ||
    service.includes('type:\n              "HIRING_OUTCOME_RECORDED"'),
  "HIRING_OUTCOME_AUDIT_EVENT_MISSING"
);

console.log("STEP_2: AUTHORIZED_OUTCOME_ROUTE");

assert(
  route.includes("requireFirebaseUser") &&
    route.includes("recordApplicationHiringOutcome"),
  "HIRING_OUTCOME_ROUTE_AUTH_OR_SERVICE_MISSING"
);

console.log("STEP_3: CLIENT_AND_UI_WORKFLOW");

assert(
  clientApi.includes("recordHiringOutcomeViaApi") &&
    clientApi.includes("/outcome"),
  "HIRING_OUTCOME_CLIENT_API_MISSING"
);
assert(
  panel.includes("입사 확정") &&
    panel.includes("불합격 확정") &&
    panel.includes("입사 예정일"),
  "HIRING_OUTCOME_UI_MISSING"
);

console.log("STEP_4: VIEW_AND_ACTIVITY_INTEGRATION");

assert(
  listService.includes("normalizeHiringOutcome") &&
    listService.includes("hiringOutcome:"),
  "HIRING_OUTCOME_APPLICATION_VIEW_MISSING"
);
assert(
  activityService.includes("HIRING_OUTCOME_RECORDED") &&
    activityService.includes("HIRING_OUTCOME_CLEARED"),
  "HIRING_OUTCOME_ACTIVITY_FILTER_MISSING"
);
assert(
  activityPanel.includes("최종 채용 결과") &&
    activityPanel.includes("최종 결과 재오픈"),
  "HIRING_OUTCOME_ACTIVITY_UI_MISSING"
);

console.log("PHASE6_HIRING_OUTCOME_CHECK_PASSED");
