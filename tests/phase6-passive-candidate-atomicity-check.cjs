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

const candidateService = read(
  "src/lib/server/candidateService.ts"
);

const candidatesRoute = read(
  "src/app/api/b2b/candidates/route.ts"
);

const domainTypes = read(
  "src/types/index.ts"
);

console.log(
  "STEP_1: PASSIVE_CANDIDATE_TRANSACTION_PROVENANCE"
);

assert(
  candidateService.includes("db.runTransaction"),
  "PASSIVE_CANDIDATE_TRANSACTION_MISSING"
);

assert(
  /organizationId:\s*actor\.organizationId/.test(
    candidateService
  ),
  "PASSIVE_CANDIDATE_ORGANIZATION_NOT_ATOMIC"
);

assert(
  /createdBy:\s*actor\.uid/.test(
    candidateService
  ),
  "PASSIVE_CANDIDATE_CREATED_BY_NOT_ATOMIC"
);

assert(
  candidateService.includes(
    "CANDIDATE_ORGANIZATION_REQUIRED"
  ),
  "PASSIVE_CANDIDATE_ORGANIZATION_GUARD_MISSING"
);

console.log(
  "STEP_2: ROUTE_POST_CREATE_WRITE_REMOVED"
);

assert(
  !candidatesRoute.includes(
    "getFirebaseAdminDb"
  ),
  "CANDIDATE_ROUTE_SHOULD_NOT_ACCESS_ADMIN_DB"
);

assert(
  !candidatesRoute.includes(
    ".update({"
  ),
  "CANDIDATE_ROUTE_POST_CREATE_UPDATE_STILL_PRESENT"
);

console.log(
  "STEP_3: DOMAIN_PROVENANCE_MODELED"
);

assert(
  /organizationId\?:\s*string\s*\|\s*null/.test(
    domainTypes
  ),
  "CANDIDATE_ORGANIZATION_TYPE_MISSING"
);

assert(
  /createdBy\?:\s*string\s*\|\s*null/.test(
    domainTypes
  ),
  "CANDIDATE_CREATED_BY_TYPE_MISSING"
);

console.log(
  "PHASE6_PASSIVE_CANDIDATE_ATOMICITY_CHECK_PASSED"
);
