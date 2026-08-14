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
  "src/lib/server/interviewService.ts"
);
const collectionRoute = read(
  "src/app/api/b2b/applications/[applicationId]/interviews/route.ts"
);
const lifecycleRoute = read(
  "src/app/api/b2b/applications/[applicationId]/interviews/[interviewId]/route.ts"
);
const clientApi = read(
  "src/lib/applicationOperationsApi.ts"
);
const operationsPanel = read(
  "src/components/b2b-admin/ApplicationOperationsPanel.tsx"
);
const activityService = read(
  "src/lib/server/applicationActivityService.ts"
);
const activityPanel = read(
  "src/components/b2b-admin/ApplicationActivityPanel.tsx"
);

console.log("STEP_1: INTERVIEW_LIFECYCLE_SERVICE");

for (const functionName of [
  "scheduleApplicationInterview",
  "updateApplicationInterview",
  "cancelApplicationInterview",
  "completeApplicationInterview",
]) {
  assert(
    service.includes(`export async function ${functionName}`),
    `INTERVIEW_FUNCTION_MISSING:${functionName}`
  );
}

assert(
  service.includes("assertInterviewOwnership"),
  "INTERVIEW_OWNERSHIP_GUARD_MISSING"
);
assert(
  service.includes("TENANT_ACCESS_DENIED"),
  "INTERVIEW_TENANT_GUARD_MISSING"
);
assert(
  service.includes('interviewData.status !==\n        "SCHEDULED"'),
  "INTERVIEW_STATUS_TRANSITION_GUARD_MISSING"
);
assert(
  service.includes('"PASS"') &&
    service.includes('"FAIL"') &&
    service.includes('"HOLD"') &&
    service.includes('"NO_SHOW"'),
  "INTERVIEW_RESULT_ENUM_MISSING"
);

console.log("STEP_2: AUTHORIZED_INTERVIEW_ROUTES");

assert(
  collectionRoute.includes("requireFirebaseUser") &&
    collectionRoute.includes("interviewService"),
  "INTERVIEW_COLLECTION_ROUTE_AUTH_OR_SERVICE_MISSING"
);
assert(
  lifecycleRoute.includes("requireFirebaseUser") &&
    lifecycleRoute.includes('action === "UPDATE"') &&
    lifecycleRoute.includes('action === "CANCEL"') &&
    lifecycleRoute.includes('action === "COMPLETE"'),
  "INTERVIEW_LIFECYCLE_ROUTE_ACTIONS_MISSING"
);

console.log("STEP_3: CLIENT_AND_UI_CONTROLS");

for (const functionName of [
  "updateApplicationInterviewViaApi",
  "cancelApplicationInterviewViaApi",
  "completeApplicationInterviewViaApi",
]) {
  assert(
    clientApi.includes(functionName),
    `INTERVIEW_CLIENT_FUNCTION_MISSING:${functionName}`
  );
}

assert(
  operationsPanel.includes("면접 일정 수정") &&
    operationsPanel.includes("면접 결과 기록") &&
    operationsPanel.includes("면접 취소"),
  "INTERVIEW_LIFECYCLE_UI_MISSING"
);

console.log("STEP_4: AUDIT_TIMELINE");

for (const eventType of [
  "INTERVIEW_UPDATED",
  "INTERVIEW_COMPLETED",
  "INTERVIEW_CANCELED",
]) {
  assert(
    service.includes(`"${eventType}"`),
    `INTERVIEW_AUDIT_EVENT_WRITE_MISSING:${eventType}`
  );
  assert(
    activityService.includes(`"${eventType}"`),
    `INTERVIEW_ACTIVITY_FILTER_MISSING:${eventType}`
  );
  assert(
    activityPanel.includes(`${eventType}:`),
    `INTERVIEW_ACTIVITY_LABEL_MISSING:${eventType}`
  );
}

console.log("PHASE6_INTERVIEW_LIFECYCLE_CHECK_PASSED");
