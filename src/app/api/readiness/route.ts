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

export async function GET() {
  const missingEnvironment = REQUIRED_SERVER_ENV.filter(
    (key) => !process.env[key]?.trim()
  );

  const emailAutomation = Boolean(
    process.env.COMMUNICATION_EMAIL_PROVIDER?.trim().toUpperCase() === "RESEND" &&
      process.env.RESEND_API_KEY?.trim() &&
      process.env.COMMUNICATION_FROM_EMAIL?.trim()
  );

  const checks = {
    environment: missingEnvironment.length === 0,
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

  const ready = checks.environment && checks.firestore;

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      service: "the-lobby-platform",
      checks,
      capabilities: {
        candidateAuth: checks.environment,
        aiResumeAndJobParsing: Boolean(process.env.GROQ_API_KEY?.trim()),
        emailAutomation,
        communicationMode: emailAutomation ? "RESEND" : "MANUAL",
      },
      ...(missingEnvironment.length > 0 ? { missingEnvironment } : {}),
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
