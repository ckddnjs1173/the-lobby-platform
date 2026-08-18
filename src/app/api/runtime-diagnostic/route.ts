import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiagnosticStatus = "ok" | "missing" | "invalid" | "failed" | "not-run";

function diagnosticError(error: unknown) {
  const object = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const cause = object?.cause && typeof object.cause === "object"
    ? (object.cause as Record<string, unknown>)
    : null;
  const message = error instanceof Error ? error.message : "";
  const causeMessage = cause?.message instanceof String
    ? String(cause.message)
    : typeof cause?.message === "string"
      ? cause.message
      : "";
  const combined = `${message}\n${causeMessage}`;
  const directCode = object?.code;
  const causeCode = cause?.code;
  const code =
    typeof directCode === "string" || typeof directCode === "number"
      ? String(directCode).slice(0, 120)
      : typeof causeCode === "string" || typeof causeCode === "number"
        ? String(causeCode).slice(0, 120)
        : null;

  let category = "unknown";
  if (/Cannot find module|MODULE_NOT_FOUND/i.test(combined)) category = "module-not-found";
  else if (/ERR_REQUIRE_ESM|require\(\).*ES Module/i.test(combined)) category = "require-esm";
  else if (/Package subpath|ERR_PACKAGE_PATH_NOT_EXPORTED/i.test(combined)) category = "package-export";
  else if (/SyntaxError|Unexpected token/i.test(combined)) category = "syntax";
  else if (/ReferenceError/i.test(combined)) category = "reference";

  const knownDependencies = [
    "firebase-admin",
    "jsonwebtoken",
    "jwks-rsa",
    "google-auth-library",
    "@fastify/busboy",
    "jwa",
    "jws",
  ];
  const dependency = knownDependencies.find((name) => combined.includes(name)) || null;

  return {
    status: "failed",
    name: error instanceof Error ? error.name : "UnknownError",
    code,
    category,
    dependency,
  };
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
      result.authImport = diagnosticError(error);
    }

    let adminFirestore: typeof import("firebase-admin/firestore") | null = null;
    try {
      adminFirestore = await import("firebase-admin/firestore");
      result.firestoreImport = typeof adminFirestore.getFirestore === "function" ? "ok" : "failed";
    } catch (error) {
      result.firestoreImport = diagnosticError(error);
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
          result.firestoreRead = diagnosticError(error);
        }
      }

      await adminApp.deleteApp(app).catch(() => undefined);
    } catch (error) {
      result.credentialInitialization = diagnosticError(error);
    }
  } catch (error) {
    result.appImport = diagnosticError(error);
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
