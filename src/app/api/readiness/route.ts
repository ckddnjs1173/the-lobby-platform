import { NextResponse } from "next/server";

import { getFirebaseAdminDb } from "../../../lib/server/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_SERVER_ENV = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "GROQ_API_KEY",
] as const;

const REQUIRED_PUBLIC_LAUNCH_ENV = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL",
  "NEXT_PUBLIC_OPERATOR_ADDRESS",
  "NEXT_PUBLIC_CUSTOMER_SUPPORT_CONTACT",
  "NEXT_PUBLIC_ACCOUNT_PROFILE_RETENTION",
  "NEXT_PUBLIC_TALENT_POOL_RETENTION",
  "NEXT_PUBLIC_APPLICATION_RETENTION",
  "NEXT_PUBLIC_CONSENT_RETENTION",
  "NEXT_PUBLIC_INFRA_PROCESSING_DISCLOSURE",
] as const;

function read(key: string) {
  return process.env[key]?.trim() || "";
}

function looksLikePlaceholder(value: string) {
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

function hasValidPublicLaunchConfiguration() {
  const valuesValid = REQUIRED_PUBLIC_LAUNCH_ENV.every(
    (key) => !looksLikePlaceholder(read(key))
  );
  if (!valuesValid) return false;

  try {
    const siteUrl = new URL(read("NEXT_PUBLIC_SITE_URL"));
    if (siteUrl.protocol !== "https:") return false;
  } catch {
    return false;
  }

  return read("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL").includes("@");
}

export async function GET() {
  const missingEnvironment = REQUIRED_SERVER_ENV.filter((key) => !read(key));
  const publicLaunchMode = read("PUBLIC_LAUNCH_MODE").toLowerCase() === "true";
  const missingPublicLaunchEnvironment = publicLaunchMode
    ? REQUIRED_PUBLIC_LAUNCH_ENV.filter((key) => looksLikePlaceholder(read(key)))
    : [];

  const emailAutomation = Boolean(
    read("COMMUNICATION_EMAIL_PROVIDER").toUpperCase() === "RESEND" &&
      read("RESEND_API_KEY") &&
      read("COMMUNICATION_FROM_EMAIL")
  );

  const checks = {
    environment: missingEnvironment.length === 0,
    publicLaunchConfiguration:
      !publicLaunchMode || hasValidPublicLaunchConfiguration(),
    firestore: false,
  };

  if (checks.environment) {
    try {
      await getFirebaseAdminDb().collection("organizations").limit(1).get();
      checks.firestore = true;
    } catch (error) {
      console.error("Readiness Firestore check failed:", error);
    }
  }

  const ready =
    checks.environment &&
    checks.publicLaunchConfiguration &&
    checks.firestore;

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "the-lobby-platform",
      checks,
      capabilities: {
        candidateAuth: checks.environment,
        aiResumeAndJobParsing: Boolean(read("GROQ_API_KEY")),
        emailAutomation,
        communicationMode: emailAutomation ? "RESEND" : "MANUAL",
        publicLaunchMode,
      },
      ...(missingEnvironment.length > 0 ? { missingEnvironment } : {}),
      ...(missingPublicLaunchEnvironment.length > 0
        ? { missingPublicLaunchEnvironment }
        : {}),
      timestamp: new Date().toISOString(),
      revision:
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.VERCEL_DEPLOYMENT_ID ||
        "local",
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
