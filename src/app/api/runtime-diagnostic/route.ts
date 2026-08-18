import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiagnosticStatus = "ok" | "missing" | "invalid" | "failed" | "not-run";

function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" || typeof value === "number" ? String(value).slice(0, 120) : null;
}

export async function GET() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n").trim();

  const environment = {
    projectId: (projectId ? "ok" : "missing") as DiagnosticStatus,
    clientEmail: (clientEmail ? "ok" : "missing") as DiagnosticStatus,
    privateKey: (rawPrivateKey.trim() ? "ok" : "missing") as DiagnosticStatus,
    privateKeyPemShape: (
      privateKey.startsWith("-----BEGIN PRIVATE KEY-----") &&
      privateKey.endsWith("-----END PRIVATE KEY-----")
        ? "ok"
        : "invalid"
    ) as DiagnosticStatus,
  };

  const result: Record<string, unknown> = {
    nodeMajor: process.versions.node.split(".")[0],
    environment,
    appImport: "not-run" satisfies DiagnosticStatus,
    authImport: "not-run" satisfies DiagnosticStatus,
    firestoreImport: "not-run" satisfies DiagnosticStatus,
    credentialInitialization: "not-run" satisfies DiagnosticStatus,
    firestoreRead: "not-run" satisfies DiagnosticStatus,
  };

  try {
    const adminApp = await import("firebase-admin/app");
    result.appImport = "ok";

    try {
      const adminAuth = await import("firebase-admin/auth");
      result.authImport = typeof adminAuth.getAuth === "function" ? "ok" : "failed";
    } catch (error) {
      result.authImport = { status: "failed", code: errorCode(error) };
    }

    let adminFirestore: typeof import("firebase-admin/firestore") | null = null;
    try {
      adminFirestore = await import("firebase-admin/firestore");
      result.firestoreImport = typeof adminFirestore.getFirestore === "function" ? "ok" : "failed";
    } catch (error) {
      result.firestoreImport = { status: "failed", code: errorCode(error) };
    }

    if (!projectId || !clientEmail || !rawPrivateKey.trim()) {
      result.credentialInitialization = "missing";
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    try {
      const app = adminApp.initializeApp(
        {
          credential: adminApp.cert({ projectId, clientEmail, privateKey }),
          projectId,
        },
        `runtime-diagnostic-${Date.now()}`
      );
      result.credentialInitialization = "ok";

      if (adminFirestore) {
        try {
          await adminFirestore.getFirestore(app).collection("organizations").limit(1).get();
          result.firestoreRead = "ok";
        } catch (error) {
          result.firestoreRead = { status: "failed", code: errorCode(error) };
        }
      }

      await adminApp.deleteApp(app).catch(() => undefined);
    } catch (error) {
      result.credentialInitialization = { status: "failed", code: errorCode(error) };
    }
  } catch (error) {
    result.appImport = { status: "failed", code: errorCode(error) };
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
