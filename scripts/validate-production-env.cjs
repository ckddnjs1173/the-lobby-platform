const requiredKeys = [
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

function read(key) {
  return process.env[key]?.trim() || "";
}

const missing = requiredKeys.filter(
  (key) => !read(key)
);

if (missing.length > 0) {
  console.error(
    "PRODUCTION_ENV_VALIDATION_FAILED"
  );
  console.error(
    "Missing required environment variables:"
  );
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (
  read("NEXT_PUBLIC_FIREBASE_PROJECT_ID") !==
  read("FIREBASE_ADMIN_PROJECT_ID")
) {
  console.error(
    "PRODUCTION_ENV_VALIDATION_FAILED"
  );
  console.error(
    "Firebase client/admin project IDs do not match."
  );
  process.exit(1);
}

if (
  read("COMMUNICATION_EMAIL_PROVIDER").toUpperCase() !==
  "RESEND"
) {
  console.error(
    "PRODUCTION_ENV_VALIDATION_FAILED"
  );
  console.error(
    "COMMUNICATION_EMAIL_PROVIDER must be RESEND."
  );
  process.exit(1);
}

if (
  !read("COMMUNICATION_FROM_EMAIL").includes("@")
) {
  console.error(
    "PRODUCTION_ENV_VALIDATION_FAILED"
  );
  console.error(
    "COMMUNICATION_FROM_EMAIL must contain an email address."
  );
  process.exit(1);
}

console.log(
  "PRODUCTION_ENV_VALIDATION_PASSED"
);
