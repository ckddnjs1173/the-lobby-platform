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

const provider = read(
  "src/lib/server/emailProvider.ts"
);
const service = read(
  "src/lib/server/applicationCommunicationService.ts"
);
const route = read(
  "src/app/api/b2b/applications/[applicationId]/communications/route.ts"
);
const client = read(
  "src/lib/applicationCommunicationApi.ts"
);
const panel = read(
  "src/components/b2b-admin/ApplicationCommunicationPanel.tsx"
);
const slideOver = read(
  "src/components/b2b-admin/ApplicationSlideOver.tsx"
);

console.log(
  "STEP_1: PROVIDER_IDEMPOTENCY_AND_SERVER_ONLY_SECRETS"
);

assert(
  provider.includes(
    '"https://api.resend.com/emails"'
  ),
  "RESEND_DELIVERY_ENDPOINT_MISSING"
);
assert(
  provider.includes(
    '"Idempotency-Key"'
  ) &&
    provider.includes(
      "input.idempotencyKey"
    ),
  "PROVIDER_IDEMPOTENCY_MISSING"
);
assert(
  provider.includes(
    '"RESEND_API_KEY"'
  ) &&
    provider.includes(
      '"COMMUNICATION_FROM_EMAIL"'
    ),
  "PROVIDER_SERVER_ENV_MISSING"
);
assert(
  !client.includes("RESEND_API_KEY") &&
    !panel.includes("RESEND_API_KEY"),
  "PROVIDER_SECRET_LEAKED_TO_CLIENT"
);

console.log(
  "STEP_2: TENANT_SCOPED_OUTBOX_AND_RECIPIENT_INTEGRITY"
);

assert(
  service.includes(
    'collection("communications")'
  ),
  "COMMUNICATION_OUTBOX_MISSING"
);
assert(
  service.includes(
    "requireB2BActor"
  ) &&
    service.includes(
      "TENANT_ACCESS_DENIED"
    ),
  "COMMUNICATION_TENANT_GUARD_MISSING"
);
assert(
  service.includes(
    "data.candidateSnapshot.email"
  ) &&
    !service.includes(
      "rawInput.to"
    ),
  "COMMUNICATION_RECIPIENT_MUST_COME_FROM_APPLICATION"
);
assert(
  service.includes(
    "transaction.get(applicationRef)"
  ) &&
    service.includes(
      "transaction.get(communicationRef)"
    ) &&
    service.includes(
      "buildAuthorizedApplicationContext"
    ),
  "COMMUNICATION_AUTHORIZATION_MUST_BE_TRANSACTIONAL"
);
assert(
  service.includes(
    "COMMUNICATION_REQUEST_ID_REUSED"
  ) &&
    service.includes(
      "COMMUNICATION_DELIVERY_STATE_UNKNOWN"
    ) &&
    service.includes(
      "SAFE_PENDING_RETRY_WINDOW_MS"
    ),
  "COMMUNICATION_REQUEST_ID_GUARDS_MISSING"
);
assert(
  service.includes(
    'createHash("sha256")'
  ) &&
    service.includes(
      "providerIdempotencyKey"
    ),
  "COMMUNICATION_PROVIDER_IDEMPOTENCY_KEY_MISSING"
);
assert(
  service.includes(
    'status: "PENDING"'
  ) &&
    service.includes(
      'status: "SENT"'
    ) &&
    service.includes(
      'status: "FAILED"'
    ),
  "COMMUNICATION_OUTBOX_STATES_MISSING"
);
assert(
  service.includes(
    '"EMAIL_SENT" satisfies EventType'
  ) &&
    service.includes(
      "lastActivityAt"
    ),
  "COMMUNICATION_AUDIT_EVENT_MISSING"
);
assert(
  !service.includes(
    "firebase/firestore"
  ),
  "COMMUNICATION_SERVICE_MUST_USE_ADMIN_ONLY"
);

console.log(
  "STEP_3: AUTHORIZED_COMMUNICATION_API"
);

const authIndex =
  route.indexOf(
    "requireFirebaseUser"
  );
const sendIndex =
  route.indexOf(
    "sendApplicationEmail("
  );

assert(
  authIndex >= 0 &&
    sendIndex >= 0 &&
    authIndex < sendIndex,
  "COMMUNICATION_AUTH_MUST_PRECEDE_SEND"
);
assert(
  route.includes(
    "listApplicationCommunications"
  ) &&
    route.includes(
      "sendApplicationEmail"
    ),
  "COMMUNICATION_API_OPERATIONS_MISSING"
);

console.log(
  "STEP_4: RECRUITER_UI_SAFE_RETRY"
);

assert(
  client.includes(
    "Authorization:"
  ) &&
    client.includes(
      "sendApplicationEmailViaApi"
    ),
  "COMMUNICATION_CLIENT_AUTH_MISSING"
);
assert(
  panel.includes(
    "createRequestId"
  ) &&
    panel.includes(
      "setRequestId(createRequestId())"
    ),
  "COMMUNICATION_UI_REQUEST_ID_MISSING"
);
assert(
  panel.includes(
    "내용 수정 없이 다시 시도하면 동일 요청 ID를 재사용합니다"
  ),
  "COMMUNICATION_RETRY_NOTICE_MISSING"
);
assert(
  slideOver.includes(
    "ApplicationCommunicationPanel"
  ),
  "COMMUNICATION_PANEL_NOT_INTEGRATED"
);

console.log(
  "PHASE7_COMMUNICATION_CHECK_PASSED"
);
