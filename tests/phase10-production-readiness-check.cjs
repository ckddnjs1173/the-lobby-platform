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

const packageJson = JSON.parse(
  read("package.json")
);
const envExample = read(".env.example");
const envValidator = read(
  "scripts/validate-production-env.cjs"
);
const workflow = read(
  ".github/workflows/ci.yml"
);
const healthRoute = read(
  "src/app/api/health/route.ts"
);
const smoke = read(
  "tests/phase10-production-smoke.cjs"
);
const runbook = read(
  "docs/PRODUCTION_RUNBOOK.md"
);

console.log(
  "STEP_1: PRODUCTION_ENV_CONTRACT"
);

const requiredEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "GROQ_API_KEY",
  "COMMUNICATION_EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "COMMUNICATION_FROM_EMAIL",
];

assert(
  requiredEnvKeys.every(
    (key) =>
      envExample.includes(`${key}=`) &&
      envValidator.includes(`\"${key}\"`)
  ),
  "PRODUCTION_ENV_CONTRACT_INCOMPLETE"
);

assert(
  envValidator.includes(
    "PRODUCTION_ENV_VALIDATION_PASSED"
  ) &&
    !envValidator.includes("console.log(process.env"),
  "PRODUCTION_ENV_VALIDATOR_UNSAFE"
);

console.log(
  "STEP_2: CI_BUILD_GATE"
);

assert(
  workflow.includes("actions/checkout@v4") &&
    workflow.includes("actions/setup-node@v4") &&
    workflow.includes("npm ci") &&
    workflow.includes(
      "npm run check:phase10:static"
    ) &&
    workflow.includes("npm run build") &&
    workflow.includes("contents: read"),
  "CI_PRODUCTION_GATE_INCOMPLETE"
);

console.log(
  "STEP_3: FIRESTORE_RELEASE_COMMANDS"
);

const scripts = packageJson.scripts || {};

assert(
  scripts["deploy:firestore:indexes"]?.includes(
    "--project the-lobby-platform"
  ) &&
    scripts["deploy:firestore:rules"]?.includes(
      "--project the-lobby-platform"
    ) &&
    scripts["deploy:firestore"]?.includes(
      "firestore:rules,firestore:indexes"
    ),
  "FIRESTORE_RELEASE_COMMANDS_INCOMPLETE"
);

console.log(
  "STEP_4: HEALTH_AND_SMOKE_GATE"
);

assert(
  healthRoute.includes('status: "ok"') &&
    healthRoute.includes(
      'service: "the-lobby-platform"'
    ) &&
    healthRoute.includes(
      '"Cache-Control": "no-store"'
    ) &&
    smoke.includes("PRODUCTION_BASE_URL") &&
    smoke.includes(
      "PHASE10_PRODUCTION_SMOKE_PASSED"
    ),
  "PRODUCTION_HEALTH_OR_SMOKE_GATE_MISSING"
);

console.log(
  "STEP_5: RELEASE_RUNBOOK"
);

assert(
  runbook.includes("Local release gate") &&
    runbook.includes("npm run deploy:firestore") &&
    runbook.includes(
      "npm run check:phase10:smoke"
    ) &&
    runbook.includes("Rollback"),
  "PRODUCTION_RUNBOOK_INCOMPLETE"
);

console.log(
  "PHASE10_PRODUCTION_READINESS_CHECK_PASSED"
);
