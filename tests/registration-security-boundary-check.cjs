const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const consentService = read(
  "src/lib/server/candidateRegistrationConsentService.ts"
);
const candidateRoute = read(
  "src/app/api/candidate/me/route.ts"
);
const rules = read("firestore.rules");

console.log("STEP_1: E2E_CONSENT_BYPASS_IS_CI_LOOPBACK_ONLY");
assert(
  consentService.includes(
    "isRegistrationConsentE2EBypassEnabled(\n  request: Request"
  ),
  "Registration consent bypass must require the current Request"
);
assert(
  consentService.includes('process.env.CI !== "true"'),
  "Registration consent bypass must be limited to automated CI"
);
assert(
  consentService.includes('process.env.VERCEL_ENV === "production"'),
  "Registration consent bypass must be disabled in Vercel production"
);
assert(
  consentService.includes('"localhost"') &&
    consentService.includes('"127.0.0.1"'),
  "Registration consent bypass must be loopback-only"
);
assert(
  candidateRoute.includes(
    "isRegistrationConsentE2EBypassEnabled(request)"
  ),
  "Candidate bootstrap route must evaluate bypass against the request"
);

console.log("STEP_2: CANDIDATE_WRITES_ARE_SERVER_ONLY");
const candidateRule = rules.match(
  /match \/candidates\/\{candidateId\} \{([\s\S]*?)\n    \}/
)?.[1] || "";
assert(candidateRule, "Candidate Firestore rule block is missing");
assert(
  candidateRule.includes("allow create, update, delete: if false;"),
  "Candidate Client SDK writes must be denied"
);
assert(
  !/allow\s+(create|update):\s+if(?!\s+false)/.test(candidateRule),
  "Candidate rule must not expose another direct write path"
);

console.log("STEP_3: PROFILE_WRITES_ARE_SERVER_ONLY");
const profileRule = rules.match(
  /match \/profile\/\{candidateId\} \{([\s\S]*?)\n    \}/
)?.[1] || "";
assert(profileRule, "Profile Firestore rule block is missing");
assert(
  profileRule.includes("allow create, update, delete: if false;"),
  "Profile Client SDK writes must be denied"
);
assert(
  !/allow\s+(create|update):\s+if(?!\s+false)/.test(profileRule),
  "Profile rule must not expose another direct write path"
);

console.log("STEP_4: CONSENT_AND_AUTH_LINKS_ARE_SERVER_ONLY");
assert(
  /match \/candidateAuthLinks\/\{authUid\}[\s\S]*?allow read, create, update, delete: if false;/.test(
    rules
  ),
  "candidateAuthLinks must be server-only"
);
assert(
  /match \/candidateConsents\/\{candidateId\}[\s\S]*?allow read, create, update, delete: if false;/.test(
    rules
  ),
  "candidateConsents must be server-only"
);

console.log("REGISTRATION_SECURITY_BOUNDARY_CHECK_PASSED");
