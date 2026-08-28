const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("STEP_1: SERVER_ONLY_CONVERSION_EVENT_CONTRACT");
const eventService = read("src/lib/server/publicEventService.ts");
const publicEventRoute = read("src/app/api/public/events/route.ts");

for (const eventName of [
  "talent_pool_opted_in",
  "talent_pool_opted_out",
  "opportunity_created",
  "opportunity_accepted",
  "opportunity_declined",
  "application_submitted",
]) {
  assert(
    eventService.includes(`\"${eventName}\"`),
    `CONVERSION_EVENT_NOT_REGISTERED:${eventName}`
  );
}

assert(
  publicEventRoute.includes('const CLIENT_EVENT_NAMES = new Set(["page_view"])') &&
    !publicEventRoute.includes('CLIENT_EVENT_NAMES = new Set(["page_view",'),
  "CONVERSION_EVENTS_MUST_NOT_BE_CLIENT_WRITABLE"
);

assert(
  !eventService.includes("candidateId") &&
    !eventService.includes("authUid") &&
    !eventService.includes("email") &&
    eventService.includes("eventName") &&
    eventService.includes("path") &&
    eventService.includes("createdAt"),
  "PUBLIC_CONVERSION_ANALYTICS_MUST_REMAIN_PII_MINIMAL"
);

console.log("STEP_2: TALENT_POOL_VISIBILITY_TRANSITIONS");
const preferenceRoute = read("src/app/api/candidate/preferences/route.ts");
assert(
  preferenceRoute.includes("const previous = await getCandidatePreferences") &&
    preferenceRoute.includes("previous.talentPoolOptIn !== result.talentPoolOptIn") &&
    preferenceRoute.includes('"talent_pool_opted_in"') &&
    preferenceRoute.includes('"talent_pool_opted_out"') &&
    preferenceRoute.includes('"talent_pool_settings_saved"'),
  "TALENT_POOL_OPT_IN_OUT_MUST_ONLY_TRACK_REAL_STATE_TRANSITIONS"
);

console.log("STEP_3: OPPORTUNITY_CONVERSION_LIFECYCLE");
const adminOpportunityRoute = read("src/app/api/b2b/talent-opportunities/route.ts");
const candidateOpportunityRoute = read(
  "src/app/api/candidate/opportunities/[opportunityId]/respond/route.ts"
);
const directApplyRoute = read("src/app/api/applications/apply/route.ts");

assert(
  adminOpportunityRoute.includes('"opportunity_created"') &&
    adminOpportunityRoute.indexOf("await createTalentOpportunity") <
      adminOpportunityRoute.indexOf('"opportunity_created"'),
  "OPPORTUNITY_CREATED_MUST_TRACK_AFTER_SUCCESSFUL_MUTATION"
);

assert(
  candidateOpportunityRoute.includes('decision === "ACCEPT"') &&
    candidateOpportunityRoute.includes('"opportunity_accepted"') &&
    candidateOpportunityRoute.includes('"application_submitted"') &&
    candidateOpportunityRoute.includes('decision === "DECLINE"') &&
    candidateOpportunityRoute.includes('"opportunity_declined"') &&
    candidateOpportunityRoute.indexOf("await respondToTalentOpportunity") <
      candidateOpportunityRoute.indexOf('"opportunity_accepted"'),
  "OPPORTUNITY_RESPONSE_EVENTS_MUST_FOLLOW_SUCCESSFUL_RESPONSE_MUTATION"
);

assert(
  directApplyRoute.includes('"application_submitted"') &&
    directApplyRoute.indexOf("await createB2CApplication") <
      directApplyRoute.indexOf('"application_submitted"'),
  "DIRECT_APPLICATION_CONVERSION_EVENT_MUST_REMAIN_TRACKED"
);

console.log("STEP_4: PAGE_VIEW_ONLY_PATH_ANALYTICS");
const acquisitionService = read("src/lib/server/acquisitionAnalyticsService.ts");
assert(
  acquisitionService.includes("pageViewDocuments") &&
    acquisitionService.includes('stringValue(data.eventName) === "page_view"') &&
    acquisitionService.includes("countBy(pageViewDocuments") &&
    acquisitionService.includes("talentPoolOptedIn") &&
    acquisitionService.includes("talentPoolOptedOut") &&
    acquisitionService.includes("opportunitiesCreated") &&
    acquisitionService.includes("opportunitiesAccepted") &&
    acquisitionService.includes("opportunitiesDeclined"),
  "ACQUISITION_ANALYTICS_MUST_SEPARATE_VISITS_FROM_CONVERSIONS"
);

console.log("STEP_5: ADMIN_CONVERSION_VISIBILITY");
const acquisitionPage = read("src/app/b2b-admin/acquisition/page.tsx");
const acquisitionApi = read("src/lib/acquisitionAnalyticsApi.ts");
assert(
  acquisitionPage.includes("인재풀 → 제안 → 지원 전환") &&
    acquisitionPage.includes("Pool ON") &&
    acquisitionPage.includes("Proposed") &&
    acquisitionPage.includes("Accepted") &&
    acquisitionPage.includes("Declined") &&
    acquisitionPage.includes("직접 지원 + 제안 수락 지원") &&
    acquisitionApi.includes("talentPoolOptedIn") &&
    acquisitionApi.includes("opportunitiesAccepted"),
  "ADMIN_ANALYTICS_MUST_EXPOSE_CONSENT_SAFE_CONVERSION_FUNNEL"
);

console.log("P1_ANALYTICS_CONVERSION_CHECK_PASSED");
