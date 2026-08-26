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
];

const publicLaunchRequiredKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL",
  "NEXT_PUBLIC_OPERATOR_ADDRESS",
  "NEXT_PUBLIC_CUSTOMER_SUPPORT_CONTACT",
  "NEXT_PUBLIC_ACCOUNT_PROFILE_RETENTION",
  "NEXT_PUBLIC_TALENT_POOL_RETENTION",
  "NEXT_PUBLIC_APPLICATION_RETENTION",
  "NEXT_PUBLIC_CONSENT_RETENTION",
  "NEXT_PUBLIC_INFRA_PROCESSING_DISCLOSURE",
];

function read(key) {
  return process.env[key]?.trim() || "";
}

function fail(message) {
  console.error("PRODUCTION_ENV_VALIDATION_FAILED");
  console.error(message);
  process.exit(1);
}

function looksLikePlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("your-production-domain.example") ||
    normalized.includes("example.com") ||
    normalized.includes("todo") ||
    normalized.includes("tbd") ||
    normalized.includes("미정") ||
    normalized.includes("확정 필요")
  );
}

const missing = requiredKeys.filter((key) => !read(key));

if (missing.length > 0) {
  console.error("PRODUCTION_ENV_VALIDATION_FAILED");
  console.error("Missing required environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

if (
  read("NEXT_PUBLIC_FIREBASE_PROJECT_ID") !==
  read("FIREBASE_ADMIN_PROJECT_ID")
) {
  fail("Firebase client/admin project IDs do not match.");
}

const launchModeRaw = read("PUBLIC_LAUNCH_MODE").toLowerCase();
if (launchModeRaw && !["true", "false"].includes(launchModeRaw)) {
  fail("PUBLIC_LAUNCH_MODE must be either true or false when configured.");
}

const publicLaunchMode = launchModeRaw === "true";

if (publicLaunchMode) {
  const missingPublicLaunch = publicLaunchRequiredKeys.filter((key) => !read(key));
  if (missingPublicLaunch.length > 0) {
    console.error("PRODUCTION_ENV_VALIDATION_FAILED");
    console.error("PUBLIC_LAUNCH_MODE=true requires these public launch values:");
    for (const key of missingPublicLaunch) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  const placeholderPublicLaunch = publicLaunchRequiredKeys.filter((key) =>
    looksLikePlaceholder(read(key))
  );
  if (placeholderPublicLaunch.length > 0) {
    console.error("PRODUCTION_ENV_VALIDATION_FAILED");
    console.error("Public launch values must not contain placeholder text:");
    for (const key of placeholderPublicLaunch) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  let siteUrl;
  try {
    siteUrl = new URL(read("NEXT_PUBLIC_SITE_URL"));
  } catch {
    fail("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
  }

  if (siteUrl.protocol !== "https:") {
    fail("NEXT_PUBLIC_SITE_URL must use HTTPS for public launch.");
  }

  if (!read("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL").includes("@")) {
    fail("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL must contain an email address.");
  }

  console.log("PUBLIC_LAUNCH_MODE=LIVE");
} else {
  console.log("PUBLIC_LAUNCH_MODE=PREVIEW");
}

const communicationProvider = read("COMMUNICATION_EMAIL_PROVIDER").toUpperCase();
const resendApiKey = read("RESEND_API_KEY");
const communicationFromEmail = read("COMMUNICATION_FROM_EMAIL");
const emailAutomationRequested = Boolean(resendApiKey || communicationFromEmail);

if (emailAutomationRequested) {
  if (communicationProvider !== "RESEND") {
    fail("When email automation is configured, COMMUNICATION_EMAIL_PROVIDER must be RESEND.");
  }

  if (!resendApiKey || !communicationFromEmail) {
    fail("Email automation requires both RESEND_API_KEY and COMMUNICATION_FROM_EMAIL.");
  }

  if (!communicationFromEmail.includes("@")) {
    fail("COMMUNICATION_FROM_EMAIL must contain an email address.");
  }

  console.log("COMMUNICATION_MODE=RESEND");
} else {
  console.log("COMMUNICATION_MODE=MANUAL");
}

console.log("PRODUCTION_ENV_VALIDATION_PASSED");
