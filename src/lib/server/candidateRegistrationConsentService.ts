import { FieldValue } from "firebase-admin/firestore";

import { CANDIDATE_CONSENT_VERSION } from "./candidatePreferenceService";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export const REGISTRATION_CONSENT_COOKIE = "the_lobby_registration_consent";

export function isRegistrationConsentE2EBypassEnabled(): boolean {
  return process.env.E2E_ALLOW_REGISTRATION_WITHOUT_CONSENT === "true";
}

export function hasRegistrationConsentCookie(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  return cookies.some((cookie) => {
    const separator = cookie.indexOf("=");
    if (separator < 0) return false;
    const name = cookie.slice(0, separator).trim();
    const value = decodeURIComponent(cookie.slice(separator + 1).trim());
    return (
      name === REGISTRATION_CONSENT_COOKIE &&
      value === CANDIDATE_CONSENT_VERSION
    );
  });
}

export async function recordCandidateRegistrationConsent(
  candidateId: string
): Promise<void> {
  const serverTimestamp = FieldValue.serverTimestamp();
  await getFirebaseAdminDb()
    .collection("candidateConsents")
    .doc(candidateId)
    .set(
      {
        candidateId,
        privacyConsent: true,
        termsConsent: true,
        consentVersion: CANDIDATE_CONSENT_VERSION,
        privacyConsentAt: serverTimestamp,
        termsConsentAt: serverTimestamp,
        updatedAt: serverTimestamp,
      },
      { merge: true }
    );
}
