import { FieldValue } from "firebase-admin/firestore";

import { CANDIDATE_CONSENT_VERSION } from "./candidatePreferenceService";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export const REGISTRATION_CONSENT_COOKIE = "the_lobby_registration_consent";

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

/**
 * Synthetic registration-consent bypass is intentionally limited to automated
 * CI requests against a loopback server. An accidentally configured production
 * environment variable must never disable the public registration-consent gate.
 */
export function isRegistrationConsentE2EBypassEnabled(
  request: Request
): boolean {
  if (process.env.E2E_ALLOW_REGISTRATION_WITHOUT_CONSENT !== "true") {
    return false;
  }

  if (process.env.CI !== "true") {
    return false;
  }

  if (process.env.VERCEL_ENV === "production") {
    return false;
  }

  try {
    const hostname = new URL(request.url).hostname.toLowerCase();
    return LOOPBACK_HOSTS.has(hostname);
  } catch {
    return false;
  }
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

/**
 * Compensating cleanup for a brand-new registration when the consent audit
 * write fails after Candidate/Profile/AuthLink creation. Existing candidates
 * are never removed by this helper. If another concurrent request has already
 * written consent, cleanup is skipped.
 */
export async function rollbackNewCandidateRegistration(
  candidateId: string,
  authUid: string
): Promise<void> {
  const db = getFirebaseAdminDb();
  const candidateRef = db.collection("candidates").doc(candidateId);
  const profileRef = db.collection("profile").doc(candidateId);
  const linkRef = db.collection("candidateAuthLinks").doc(authUid);
  const consentRef = db.collection("candidateConsents").doc(candidateId);

  await db.runTransaction(async (transaction) => {
    const [candidateSnapshot, linkSnapshot, consentSnapshot] =
      await Promise.all([
        transaction.get(candidateRef),
        transaction.get(linkRef),
        transaction.get(consentRef),
      ]);

    // Another request completed the consent audit; preserve the registration.
    if (consentSnapshot.exists) {
      return;
    }

    const candidate = candidateSnapshot.data();
    if (!candidateSnapshot.exists || candidate?.authUid !== authUid) {
      return;
    }

    const linkedCandidateId = linkSnapshot.data()?.candidateId;
    if (
      linkSnapshot.exists &&
      linkedCandidateId !== candidateId
    ) {
      return;
    }

    transaction.delete(profileRef);
    transaction.delete(candidateRef);

    if (linkSnapshot.exists) {
      transaction.delete(linkRef);
    }
  });
}
