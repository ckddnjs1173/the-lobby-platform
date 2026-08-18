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

const analyticsService = read(
  "src/lib/server/recruitingAnalyticsService.ts"
);
const analyticsRoute = read(
  "src/app/api/b2b/analytics/route.ts"
);
const analyticsPage = read(
  "src/app/b2b-admin/analytics/page.tsx"
);
const applicationPageService = read(
  "src/lib/server/applicationPageService.ts"
);
const applicationPageRoute = read(
  "src/app/api/b2b/applications/page/route.ts"
);
const applicationApi = read(
  "src/lib/applicationApi.ts"
);
const layout = read(
  "src/app/b2b-admin/layout.tsx"
);
const indexes = read(
  "firestore.indexes.json"
);
const packageJson = JSON.parse(
  read("package.json")
);

console.log(
  "STEP_1: BOUNDED_TENANT_ANALYTICS"
);

assert(
  analyticsService.includes(
    "MAX_ANALYTICS_DOCUMENTS = 5_000"
  ) &&
    analyticsService.includes(
      ".limit(MAX_ANALYTICS_DOCUMENTS + 1)"
    ) &&
    analyticsService.includes(
      'query = query.where(\n      "organizationId"'
    ) &&
    analyticsService.includes(
      "ANALYTICS_TENANT_ACCESS_DENIED"
    ),
  "ANALYTICS_MUST_BE_BOUNDED_AND_TENANT_SCOPED"
);

assert(
  analyticsService.includes(
    'Timestamp.fromMillis(windowStartedAtMillis)'
  ) &&
    analyticsService.includes(
      '.orderBy("appliedAt", "desc")'
    ),
  "ANALYTICS_WINDOW_QUERY_MISSING"
);

console.log(
  "STEP_2: AUTHORIZED_ANALYTICS_API_AND_UI"
);

assert(
  analyticsRoute.includes(
    "requireFirebaseUser"
  ) &&
    analyticsRoute.includes(
      "await requireFirebaseUser"
    ) &&
    analyticsRoute.includes(
      "getRecruitingAnalytics("
    ) &&
    analyticsPage.includes(
      "fetchRecruitingAnalytics"
    ) &&
    analyticsPage.includes(
      "채용 운영 분석"
    ) &&
    layout.includes(
      'href: "/b2b-admin/analytics"'
    ) &&
    layout.includes(
      'label: "채용 분석"'
    ),
  "ANALYTICS_API_OR_UI_INTEGRATION_MISSING"
);

console.log(
  "STEP_3: CURSOR_PAGINATED_APPLICATION_READ"
);

assert(
  applicationPageService.includes(
    "MAX_APPLICATION_PAGE_SIZE = 100"
  ) &&
    applicationPageService.includes(
      '.orderBy("appliedAt", "desc")'
    ) &&
    applicationPageService.includes(
      "query.startAfter(cursorSnapshot)"
    ) &&
    applicationPageService.includes(
      "APPLICATION_CURSOR_TENANT_DENIED"
    ) &&
    applicationPageRoute.includes(
      "listB2BApplicationPage("
    ),
  "APPLICATION_CURSOR_PAGINATION_MISSING"
);

console.log(
  "STEP_4: WORKSPACE_FULL_SCAN_REMOVED"
);

assert(
  applicationApi.includes(
    "MAX_WORKSPACE_APPLICATIONS = 500"
  ) &&
    applicationApi.includes(
      "/api/b2b/applications/page?"
    ) &&
    !applicationApi.includes(
      'authorizedJsonRequest<ApplicationView[]>(\n    "/api/b2b/applications"'
    ),
  "WORKSPACE_MUST_USE_BOUNDED_CURSOR_PAGES"
);

console.log(
  "STEP_5: FIRESTORE_INDEX_SUPPORT"
);

assert(
  indexes.includes(
    '"collectionGroup": "applications"'
  ) &&
    indexes.includes(
      '"fieldPath": "organizationId"'
    ) &&
    indexes.includes(
      '"fieldPath": "appliedAt"'
    ),
  "APPLICATION_ANALYTICS_INDEX_MISSING"
);

assert(
  packageJson.scripts?.["deploy:firestore:indexes"] ===
    "firebase deploy --only firestore:indexes --project the-lobby-platform",
  "FIRESTORE_INDEX_DEPLOYMENT_MUST_TARGET_PROJECT_EXPLICITLY"
);

console.log(
  "PHASE9_ANALYTICS_PERFORMANCE_CHECK_PASSED"
);