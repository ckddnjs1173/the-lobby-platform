const { spawnSync } = require("child_process");

const nodeCommand = process.execPath;

const baseEnv = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "the-lobby-platform",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:test",
  FIREBASE_ADMIN_PROJECT_ID: "the-lobby-platform",
  FIREBASE_ADMIN_CLIENT_EMAIL: "firebase-admin@test.invalid",
  FIREBASE_ADMIN_PRIVATE_KEY: "test-private-key",
  GROQ_API_KEY: "test-groq-key",
  COMMUNICATION_EMAIL_PROVIDER: "",
  RESEND_API_KEY: "",
  COMMUNICATION_FROM_EMAIL: "",
};

const liveEnv = {
  PUBLIC_LAUNCH_MODE: "true",
  NEXT_PUBLIC_SITE_URL: "https://thelobby.test",
  NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL: "privacy@thelobby.test",
  NEXT_PUBLIC_OPERATOR_ADDRESS: "서울특별시 공개 운영 주소",
  NEXT_PUBLIC_CUSTOMER_SUPPORT_CONTACT: "support@thelobby.test",
  NEXT_PUBLIC_ACCOUNT_PROFILE_RETENTION: "회원 탈퇴 또는 삭제 요청 시 지체 없이 파기",
  NEXT_PUBLIC_TALENT_POOL_RETENTION: "인재풀 공개 동의 철회 시 신규 검색에서 제외하고 운영정책에 따라 파기",
  NEXT_PUBLIC_APPLICATION_RETENTION: "채용 절차 종료 후 확정된 운영정책 기간 동안 보관 후 파기",
  NEXT_PUBLIC_CONSENT_RETENTION: "동의 및 철회 증빙을 확정된 운영정책 기간 동안 보관 후 파기",
  NEXT_PUBLIC_INFRA_PROCESSING_DISCLOSURE: "실제 운영 호스팅 계약과 데이터 흐름을 반영한 처리위탁 및 국외 처리 고지",
};

function run(extraEnv) {
  return spawnSync(nodeCommand, ["scripts/validate-production-env.cjs"], {
    cwd: process.cwd(),
    env: { ...baseEnv, ...extraEnv },
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("STEP_1: PREVIEW_MODE_REMAINS_DEPLOYABLE");
const preview = run({ PUBLIC_LAUNCH_MODE: "false" });
assert(preview.status === 0, preview.stderr || "PREVIEW_ENV_SHOULD_PASS");
assert(preview.stdout.includes("PUBLIC_LAUNCH_MODE=PREVIEW"), "PREVIEW_MARKER_MISSING");

console.log("STEP_2: LIVE_MODE_REJECTS_MISSING_OWNER_VALUES");
const liveMissing = run({ PUBLIC_LAUNCH_MODE: "true" });
assert(liveMissing.status !== 0, "LIVE_MODE_MUST_REJECT_MISSING_VALUES");
assert(
  `${liveMissing.stdout}\n${liveMissing.stderr}`.includes("PUBLIC_LAUNCH_MODE=true requires these public launch values"),
  "LIVE_MISSING_VALUES_ERROR_MISSING"
);

console.log("STEP_3: LIVE_MODE_REJECTS_PLACEHOLDERS");
const livePlaceholder = run({
  ...liveEnv,
  NEXT_PUBLIC_SITE_URL: "https://your-production-domain.example",
  NEXT_PUBLIC_OPERATOR_ADDRESS: "미정",
});
assert(livePlaceholder.status !== 0, "LIVE_MODE_MUST_REJECT_PLACEHOLDERS");
assert(
  `${livePlaceholder.stdout}\n${livePlaceholder.stderr}`.includes("Public launch values must not contain placeholder text"),
  "LIVE_PLACEHOLDER_ERROR_MISSING"
);

console.log("STEP_4: LIVE_MODE_ACCEPTS_COMPLETE_CONFIGURATION");
const liveComplete = run(liveEnv);
assert(liveComplete.status === 0, liveComplete.stderr || "COMPLETE_LIVE_ENV_SHOULD_PASS");
assert(liveComplete.stdout.includes("PUBLIC_LAUNCH_MODE=LIVE"), "LIVE_MARKER_MISSING");
assert(liveComplete.stdout.includes("COMMUNICATION_MODE=MANUAL"), "MANUAL_COMMUNICATION_MARKER_MISSING");
assert(liveComplete.stdout.includes("PRODUCTION_ENV_VALIDATION_PASSED"), "VALIDATION_PASS_MARKER_MISSING");

console.log("PUBLIC_LAUNCH_ENV_GUARD_CHECK_PASSED");
