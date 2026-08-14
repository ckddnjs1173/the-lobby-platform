const fs = require("fs");

const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS_NOT_SET"
  );
}

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error(
    "NEXT_PUBLIC_FIREBASE_API_KEY_NOT_FOUND"
  );
}

const serviceAccount = JSON.parse(
  fs.readFileSync(
    serviceAccountPath,
    "utf8"
  )
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: "the-lobby-platform",
});

const auth = getAuth();

const baseUrl =
  process.env.E2E_BASE_URL ||
  "http://localhost:3000";

const recruiterUid =
  "e2e-recruiter-jnc";

const b2cUid =
  `e2e-phase6-file-b2c-${Date.now()}`;

function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message);
  }
}

async function exchangeCustomToken(
  uid
) {
  const customToken =
    await auth.createCustomToken(uid);

  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const body =
    await response.json();

  if (
    !response.ok ||
    !body.idToken
  ) {
    throw new Error(
      "ID_TOKEN_EXCHANGE_FAILED"
    );
  }

  return body.idToken;
}

async function callFileApi(
  file,
  idToken
) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(
    `${baseUrl}/api/b2b/candidates/parse-resume`,
    {
      method: "POST",
      headers: {
        ...(idToken
          ? {
              Authorization:
                `Bearer ${idToken}`,
            }
          : {}),
      },
      body: formData,
    }
  );

  const text =
    await response.text();

  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  return {
    status: response.status,
    body,
    text,
  };
}

function assertApiError(
  result,
  expectedStatus,
  expectedCode,
  label
) {
  console.log(
    `${label}_STATUS:`,
    result.status
  );
  console.log(
    `${label}_CODE:`,
    result.body?.code || null
  );

  assert(
    result.status === expectedStatus,
    `${label}_STATUS_MISMATCH:${result.status}`
  );
  assert(
    result.body?.code === expectedCode,
    `${label}_CODE_MISMATCH:${result.text}`
  );
}

async function run() {
  console.log(
    "STEP_1: BOOTSTRAP_NON_B2B_AUTH_USER"
  );

  await auth.createUser({
    uid: b2cUid,
    email:
      `${b2cUid}@example.com`,
    emailVerified: true,
    disabled: false,
  });

  const recruiterToken =
    await exchangeCustomToken(
      recruiterUid
    );
  const b2cToken =
    await exchangeCustomToken(
      b2cUid
    );

  console.log(
    "STEP_2: UNAUTHENTICATED_UPLOAD_DENIED_BEFORE_FILE_PARSE"
  );

  const unauthenticated =
    await callFileApi(
      new File(
        ["not a resume"],
        "resume.exe",
        {
          type: "application/octet-stream",
        }
      ),
      null
    );

  assertApiError(
    unauthenticated,
    401,
    "AUTHORIZATION_HEADER_MISSING",
    "UNAUTHENTICATED_UPLOAD"
  );

  console.log(
    "STEP_3: NON_B2B_UPLOAD_DENIED_BEFORE_FILE_PARSE"
  );

  const b2cDenied =
    await callFileApi(
      new File(
        ["not a resume"],
        "resume.exe",
        {
          type: "application/octet-stream",
        }
      ),
      b2cToken
    );

  assertApiError(
    b2cDenied,
    403,
    "B2B_USER_NOT_FOUND",
    "NON_B2B_UPLOAD"
  );

  console.log(
    "STEP_4: UNSUPPORTED_EXTENSION_BLOCKED"
  );

  const invalidExtension =
    await callFileApi(
      new File(
        ["candidate resume"],
        "resume.exe",
        {
          type: "application/octet-stream",
        }
      ),
      recruiterToken
    );

  assertApiError(
    invalidExtension,
    400,
    "UNSUPPORTED_RESUME_FILE_TYPE",
    "INVALID_EXTENSION"
  );

  console.log(
    "STEP_5: MIME_MISMATCH_BLOCKED"
  );

  const mimeMismatch =
    await callFileApi(
      new File(
        ["%PDF-fake"],
        "resume.pdf",
        {
          type: "text/plain",
        }
      ),
      recruiterToken
    );

  assertApiError(
    mimeMismatch,
    400,
    "RESUME_FILE_MIME_MISMATCH",
    "MIME_MISMATCH"
  );

  console.log(
    "STEP_6: SPOOFED_PDF_SIGNATURE_BLOCKED"
  );

  const spoofedPdf =
    await callFileApi(
      new File(
        ["this is not a PDF"],
        "resume.pdf",
        {
          type: "application/pdf",
        }
      ),
      recruiterToken
    );

  assertApiError(
    spoofedPdf,
    400,
    "RESUME_FILE_SIGNATURE_INVALID",
    "SPOOFED_PDF"
  );

  console.log(
    "STEP_7: OVERSIZED_FILE_BLOCKED"
  );

  const oversizedFile =
    new File(
      [
        Buffer.alloc(
          8 * 1024 * 1024 + 1,
          0x61
        ),
      ],
      "resume.txt",
      {
        type: "text/plain",
      }
    );

  const oversized =
    await callFileApi(
      oversizedFile,
      recruiterToken
    );

  assertApiError(
    oversized,
    413,
    "RESUME_FILE_TOO_LARGE",
    "OVERSIZED_FILE"
  );

  console.log(
    "PHASE6_RESUME_FILE_SECURITY_CHECK_PASSED"
  );
}

run()
  .then(async () => {
    try {
      await auth.deleteUser(b2cUid);
    } catch {
      // best-effort cleanup
    }

    process.exit(0);
  })
  .catch(async (error) => {
    console.error(
      "TEST_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );

    try {
      await auth.deleteUser(b2cUid);
    } catch {
      // best-effort cleanup
    }

    process.exit(1);
  });
