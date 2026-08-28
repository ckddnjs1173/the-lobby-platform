import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  CandidatePreferencesInput,
  CandidatePreferencesView,
  JobSearchStatus,
} from "../candidatePreferenceTypes";

import {
  CandidatePortalServiceError,
  getCandidatePortalProfile,
} from "./candidatePortalService";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export const CANDIDATE_CONSENT_VERSION = "2026-08-19";

export class CandidatePreferenceServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_PREFERENCE_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "CandidatePreferenceServiceError";
    this.status = status;
    this.code = code;
  }
}

const JOB_SEARCH_STATUSES = new Set<JobSearchStatus>([
  "ACTIVE",
  "OPEN",
  "NOT_LOOKING",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(
  value: unknown,
  label: string,
  maxLength: number
): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new CandidatePreferenceServiceError(
      `${label} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_PREFERENCE_FIELD"
    );
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new CandidatePreferenceServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      "PREFERENCE_FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function sanitizeBoolean(
  value: unknown,
  label: string
): boolean {
  if (typeof value !== "boolean") {
    throw new CandidatePreferenceServiceError(
      `${label} 선택값이 올바르지 않습니다.`,
      400,
      "INVALID_PREFERENCE_BOOLEAN"
    );
  }
  return value;
}

function normalizeJobSearchStatus(value: unknown): JobSearchStatus {
  if (
    typeof value !== "string" ||
    !JOB_SEARCH_STATUSES.has(value as JobSearchStatus)
  ) {
    throw new CandidatePreferenceServiceError(
      "구직 상태 선택값이 올바르지 않습니다.",
      400,
      "INVALID_JOB_SEARCH_STATUS"
    );
  }
  return value as JobSearchStatus;
}

function normalizeInput(rawInput: unknown): CandidatePreferencesInput {
  if (!isRecord(rawInput)) {
    throw new CandidatePreferenceServiceError(
      "인재풀 설정 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_PREFERENCE_BODY"
    );
  }

  const privacyConsent = sanitizeBoolean(
    rawInput.privacyConsent,
    "개인정보 수집·이용 동의"
  );
  const termsConsent = sanitizeBoolean(
    rawInput.termsConsent,
    "이용약관 동의"
  );

  if (!privacyConsent || !termsConsent) {
    throw new CandidatePreferenceServiceError(
      "인재풀 설정을 저장하려면 개인정보 수집·이용 및 이용약관에 동의해야 합니다.",
      400,
      "REQUIRED_CONSENT_MISSING"
    );
  }

  return {
    desiredJob: sanitizeString(rawInput.desiredJob, "희망 직무", 200),
    desiredLocation: sanitizeString(rawInput.desiredLocation, "희망 지역", 200),
    desiredSalary: sanitizeString(rawInput.desiredSalary, "희망 급여", 100),
    desiredEmploymentType: sanitizeString(
      rawInput.desiredEmploymentType,
      "희망 고용형태",
      100
    ),
    jobSearchStatus: normalizeJobSearchStatus(rawInput.jobSearchStatus),
    availableFrom: sanitizeString(rawInput.availableFrom, "입사 가능일", 40),
    talentPoolOptIn: sanitizeBoolean(rawInput.talentPoolOptIn, "인재풀 공개 동의"),
    jobAlertOptIn: sanitizeBoolean(rawInput.jobAlertOptIn, "새 공고 알림 수신 동의"),
    privacyConsent,
    termsConsent,
  };
}

function timestampToIso(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const timestamp = value as { toDate?: () => Date };
  if (typeof timestamp.toDate !== "function") return null;
  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function statusValue(value: unknown): JobSearchStatus {
  return JOB_SEARCH_STATUSES.has(value as JobSearchStatus)
    ? (value as JobSearchStatus)
    : "OPEN";
}

async function resolveCandidateId(authUid: string): Promise<string> {
  try {
    const profile = await getCandidatePortalProfile(authUid);
    return profile.candidateId;
  } catch (error) {
    if (error instanceof CandidatePortalServiceError) throw error;
    throw error;
  }
}

export async function getCandidatePreferences(
  authUid: string
): Promise<CandidatePreferencesView> {
  const candidateId = await resolveCandidateId(authUid);
  const db = getFirebaseAdminDb();

  const [profileSnapshot, candidateSnapshot, consentSnapshot] = await Promise.all([
    db.collection("profile").doc(candidateId).get(),
    db.collection("candidates").doc(candidateId).get(),
    db.collection("candidateConsents").doc(candidateId).get(),
  ]);

  const profile = profileSnapshot.data() || {};
  const candidate = candidateSnapshot.data() || {};
  const consent = consentSnapshot.data() || {};

  return {
    desiredJob: stringValue(profile.desiredJob),
    desiredLocation: stringValue(profile.desiredLocation),
    desiredSalary: stringValue(profile.desiredSalary),
    desiredEmploymentType: stringValue(profile.desiredEmploymentType),
    jobSearchStatus: statusValue(
      profile.jobSearchStatus || candidate.jobSearchStatus
    ),
    availableFrom: stringValue(profile.availableFrom),
    talentPoolOptIn: booleanValue(
      consent.talentPoolOptIn ?? candidate.talentPoolOptIn
    ),
    jobAlertOptIn: booleanValue(consent.jobAlertOptIn),
    consentVersion:
      typeof consent.consentVersion === "string"
        ? consent.consentVersion
        : null,
    updatedAt: timestampToIso(
      consent.updatedAt || profile.updatedAt || candidate.updatedAt
    ),
  };
}

export async function updateCandidatePreferences(
  authUid: string,
  rawInput: unknown
): Promise<CandidatePreferencesView> {
  const input = normalizeInput(rawInput);
  const candidateId = await resolveCandidateId(authUid);
  const db = getFirebaseAdminDb();

  const candidateRef = db.collection("candidates").doc(candidateId);
  const profileRef = db.collection("profile").doc(candidateId);
  const consentRef = db.collection("candidateConsents").doc(candidateId);

  await db.runTransaction(async (transaction) => {
    const [candidateSnapshot, consentSnapshot] = await Promise.all([
      transaction.get(candidateRef),
      transaction.get(consentRef),
    ]);

    if (!candidateSnapshot.exists) {
      throw new CandidatePreferenceServiceError(
        "Candidate 프로필을 찾을 수 없습니다.",
        404,
        "CANDIDATE_NOT_FOUND"
      );
    }

    const candidate = candidateSnapshot.data();
    if (!candidate || candidate.authUid !== authUid) {
      throw new CandidatePreferenceServiceError(
        "로그인 계정과 Candidate 정보가 일치하지 않습니다.",
        403,
        "CANDIDATE_OWNERSHIP_MISMATCH"
      );
    }

    if (candidate.accountStatus !== "ACTIVE") {
      throw new CandidatePreferenceServiceError(
        "현재 사용할 수 없는 Candidate 계정입니다.",
        403,
        "CANDIDATE_NOT_ACTIVE"
      );
    }

    const currentConsent: DocumentData = consentSnapshot.data() || {};
    const serverTimestamp = FieldValue.serverTimestamp();

    transaction.set(
      profileRef,
      {
        candidateId,
        desiredJob: input.desiredJob,
        desiredLocation: input.desiredLocation,
        desiredSalary: input.desiredSalary,
        desiredEmploymentType: input.desiredEmploymentType,
        jobSearchStatus: input.jobSearchStatus,
        availableFrom: input.availableFrom,
        updatedAt: serverTimestamp,
      },
      { merge: true }
    );

    transaction.update(candidateRef, {
      talentPoolOptIn: input.talentPoolOptIn,
      jobSearchStatus: input.jobSearchStatus,
      updatedAt: serverTimestamp,
    });

    transaction.set(
      consentRef,
      {
        candidateId,
        privacyConsent: true,
        termsConsent: true,
        talentPoolOptIn: input.talentPoolOptIn,
        jobAlertOptIn: input.jobAlertOptIn,
        consentVersion: CANDIDATE_CONSENT_VERSION,
        privacyConsentAt:
          currentConsent.privacyConsentAt || serverTimestamp,
        termsConsentAt:
          currentConsent.termsConsentAt || serverTimestamp,
        talentPoolConsentAt: input.talentPoolOptIn
          ? currentConsent.talentPoolConsentAt || serverTimestamp
          : null,
        updatedAt: serverTimestamp,
      },
      { merge: true }
    );
  });

  return getCandidatePreferences(authUid);
}
