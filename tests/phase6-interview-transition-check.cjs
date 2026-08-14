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
  "src/lib/server/interviewTransitionService.ts"
);
const route = read(
  "src/app/api/b2b/applications/[applicationId]/interviews/transition/route.ts"
);
const clientApi = read(
  "src/lib/applicationOperationsApi.ts"
);
const kanban = read(
  "src/components/b2b-admin/ApplicationKanban.tsx"
);

console.log("STEP_1: ATOMIC_INTERVIEW_TRANSITION_SERVICE");

assert(
  service.includes("db.runTransaction"),
  "INTERVIEW_TRANSITION_TRANSACTION_MISSING"
);
assert(
  service.includes('stage:\n                  "INTERVIEW"') ||
    service.includes('stage:\n              "INTERVIEW"'),
  "APPLICATION_INTERVIEW_STAGE_UPDATE_MISSING"
);
assert(
  service.includes('type:\n              "STAGE_CHANGED"') ||
    service.includes('type:\n            "STAGE_CHANGED"'),
  "INTERVIEW_TRANSITION_STAGE_EVENT_MISSING"
);
assert(
  service.includes('type:\n            "INTERVIEW_SCHEDULED"') ||
    service.includes('type:\n              "INTERVIEW_SCHEDULED"'),
  "INTERVIEW_TRANSITION_SCHEDULE_EVENT_MISSING"
);
assert(
  service.includes('"RECOMMENDED"') &&
    service.includes('"DOCUMENT_SCREEN"'),
  "INTERVIEW_TRANSITION_SOURCE_GUARD_MISSING"
);
assert(
  service.includes("TENANT_ACCESS_DENIED"),
  "INTERVIEW_TRANSITION_TENANT_GUARD_MISSING"
);

console.log("STEP_2: AUTHORIZED_TRANSITION_ROUTE");

assert(
  route.includes("requireFirebaseUser"),
  "INTERVIEW_TRANSITION_AUTH_MISSING"
);
assert(
  route.includes("scheduleInterviewAndTransitionApplication"),
  "INTERVIEW_TRANSITION_SERVICE_NOT_ROUTED"
);

console.log("STEP_3: CLIENT_API_AND_KANBAN_MODAL");

assert(
  clientApi.includes("scheduleInterviewAndTransitionViaApi"),
  "INTERVIEW_TRANSITION_CLIENT_FUNCTION_MISSING"
);
assert(
  clientApi.includes("/interviews/transition"),
  "INTERVIEW_TRANSITION_CLIENT_ROUTE_MISSING"
);
assert(
  kanban.includes("scheduleInterviewAndTransitionViaApi"),
  "KANBAN_INTERVIEW_ORCHESTRATION_MISSING"
);
assert(
  kanban.includes("면접 일정 확정"),
  "KANBAN_INTERVIEW_MODAL_MISSING"
);
assert(
  kanban.includes("stageOverrides"),
  "KANBAN_TRANSITION_OPTIMISTIC_STATE_MISSING"
);
assert(
  kanban.includes('stage === "INTERVIEW"'),
  "KANBAN_INTERVIEW_DROP_BRANCH_MISSING"
);

console.log("PHASE6_INTERVIEW_TRANSITION_CHECK_PASSED");
