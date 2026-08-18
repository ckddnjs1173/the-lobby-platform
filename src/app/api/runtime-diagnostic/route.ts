import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanError(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: "UnknownError", message: String(error).slice(0, 500) };
  }

  const candidate = error as Error & { code?: string | number };
  return {
    name: error.name,
    code: candidate.code ?? null,
    message: error.message
      .replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
      .slice(0, 1000),
  };
}

export async function GET() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  const normalizedPrivateKey = rawPrivateKey.replace(/\\n/g, "\n").trim();

  const result: Record<string, unknown> = {
    nodeVersion: process.version,
    environment: {
      projectIdPresent: Boolean(projectId),
      clientEmailPresent: Boolean(clientEmail),
      privateKeyPresent: Boolean(rawPrivateKey.trim()),
      groqPresent: Boolean(process.env.GROQ_API_KEY?.trim()),
      privateKeyHasEscapedNewlines: rawPrivateKey.includes("\\n"),
      privateKeyHasRealNewlines: rawPrivateKey.includes("\n"),
      privateKeyLooksLikePem:
        normalizedPrivateKey.startsWith("-----BEGIN PRIVATE KEY-----") &&
        normalizedPrivateKey.endsWith("-----END PRIVATE KEY-----"),
    },
  };

  try {
    const adminApp = await import("firebase-admin/app");
    result.firebaseAdminAppImport = "ok";

    const adminAuth = await import("firebase-admin/auth");
    result.firebaseAdminAuthImport = typeof adminAuth.getAuth === "function" ? "ok" : "unexpected";

    const adminFirestore = await import("firebase-admin/firestore");
    result.firebaseAdminFirestoreImport = typeof adminFirestore.getFirestore === "function" ? "ok" : "unexpected";

    try {
      const diagnosticName = `runtime-diagnostic-${Date.now()}`;
      const app = adminApp.initializeApp(
        {
          credential: adminApp.cert({
            projectId,
            clientEmail,
            privateKey: normalizedPrivateKey,
          }),
          projectId,
        },
        diagnosticName
      );
      result.credentialInitialization = "ok";

      try {
        await adminFirestore.getFirestore(app).collection("organizations").limit(1).get();
        result.firestoreRead = "ok";
      } catch (error) {
        result.firestoreRead = { status: "error", error: cleanError(error) };
      } finally {
        await adminApp.deleteApp(app).catch(() => undefined);
      }
    } catch (error) {
      result.credentialInitialization = { status: "error", error: cleanError(error) };
    }
  } catch (error) {
    result.firebaseAdminImport = { status: "error", error: cleanError(error) };
  }

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
