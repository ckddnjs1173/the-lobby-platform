import { FieldValue, type DocumentData } from "firebase-admin/firestore";

import {
  B2BAuthorizationError,
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export class JobOperationalDetailsServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "JOB_OPERATIONAL_DETAILS_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "JobOperationalDetailsServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface JobOperationalDetailsView {
  jobId: string;
  organizationId: string;
  workSchedule: string;
  workHours: string;
  breakTime: string;
  contractPeriod: string;
  conversionOpportunity: string;
  experienceLevel: string;
  educationLevel: string;
  headcount: string;
  benefits: string[];
  nearbyTransit: string;
  detailedLocation: string;
  applicationDeadline: string;
  updatedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeString(value: unknown, label: string, maxLength: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new JobOperationalDetailsServiceError(
      `${label} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_JOB_DETAIL_FIELD"
    );
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new JobOperationalDetailsServiceError(
      `${label} 정보가 너무 깁니다.`,
      400,
      "JOB_DETAIL_FIELD_TOO_LONG"
    );
  }
  return normalized;
}

function sanitizeBenefits(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new JobOperationalDetailsServiceError(
      "복리후생은 문자열 배열이어야 합니다.",
      400,
      "INVALID_BENEFITS"
    );
  }

  return Array.from(new Set(value.map((item) => {
    if (typeof item !== "string") {
      throw new JobOperationalDetailsServiceError(
        "복리후생 항목은 문자열이어야 합니다.",
        400,
        "INVALID_BENEFITS"
      );
    }
    const normalized = item.trim();
    if (normalized.length > 120) {
      throw new JobOperationalDetailsServiceError(
        "복리후생 개별 항목은 120자를 초과할 수 없습니다.",
        400,
        "BENEFIT_TOO_LONG"
      );
    }
    return normalized;
  }).filter(Boolean))).slice(0, 20);
}

function sanitizeDeadline(value: unknown): string {
  const normalized = sanitizeString(value, "채용 마감일", 20);
  if (!normalized) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new JobOperationalDetailsServiceError(
      "채용 마감일은 YYYY-MM-DD 형식이어야 합니다.",
      400,
      "INVALID_APPLICATION_DEADLINE"
    );
  }
  return normalized;
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

function assertAccess(actor: B2BActor, data: DocumentData): string {
  const organizationId = stringValue(data.organizationId);
  if (!organizationId) {
    throw new JobOperationalDetailsServiceError(
      "공고 조직 정보를 확인할 수 없습니다.",
      409,
      "JOB_ORGANIZATION_MISSING"
    );
  }
  if (actor.role === "RECRUITER" && actor.organizationId !== organizationId) {
    throw new JobOperationalDetailsServiceError(
      "다른 조직의 공고 상세조건은 수정할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
  return organizationId;
}

function toView(jobId: string, data: DocumentData): JobOperationalDetailsView {
  return {
    jobId,
    organizationId: stringValue(data.organizationId),
    workSchedule: stringValue(data.workSchedule),
    workHours: stringValue(data.workHours),
    breakTime: stringValue(data.breakTime),
    contractPeriod: stringValue(data.contractPeriod),
    conversionOpportunity: stringValue(data.conversionOpportunity),
    experienceLevel: stringValue(data.experienceLevel),
    educationLevel: stringValue(data.educationLevel),
    headcount: stringValue(data.headcount),
    benefits: Array.isArray(data.benefits)
      ? data.benefits.filter((item: unknown): item is string => typeof item === "string").map((item: string) => item.trim()).filter(Boolean).slice(0, 20)
      : [],
    nearbyTransit: stringValue(data.nearbyTransit),
    detailedLocation: stringValue(data.detailedLocation),
    applicationDeadline: stringValue(data.applicationDeadline),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

async function loadJob(actorUid: string, jobIdInput: string) {
  const actor = await requireB2BActor(actorUid);
  const jobId = jobIdInput.trim();
  if (!jobId) {
    throw new JobOperationalDetailsServiceError(
      "공고 ID가 필요합니다.",
      400,
      "JOB_ID_REQUIRED"
    );
  }

  const ref = getFirebaseAdminDb().collection("jobs").doc(jobId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new JobOperationalDetailsServiceError(
      "공고를 찾을 수 없습니다.",
      404,
      "JOB_NOT_FOUND"
    );
  }
  const data = snapshot.data();
  if (!data) {
    throw new JobOperationalDetailsServiceError(
      "공고 데이터가 비어 있습니다.",
      409,
      "JOB_DATA_MISSING"
    );
  }
  assertAccess(actor, data);
  return { actor, jobId, ref, data };
}

export async function getJobOperationalDetails(
  actorUid: string,
  jobIdInput: string
): Promise<JobOperationalDetailsView> {
  const { jobId, data } = await loadJob(actorUid, jobIdInput);
  return toView(jobId, data);
}

export async function updateJobOperationalDetails(
  actorUid: string,
  jobIdInput: string,
  rawInput: unknown
): Promise<JobOperationalDetailsView> {
  if (!isRecord(rawInput)) {
    throw new JobOperationalDetailsServiceError(
      "공고 상세조건 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_JOB_DETAIL_BODY"
    );
  }

  const { jobId, ref } = await loadJob(actorUid, jobIdInput);
  const update = {
    workSchedule: sanitizeString(rawInput.workSchedule, "근무요일", 160),
    workHours: sanitizeString(rawInput.workHours, "근무시간", 160),
    breakTime: sanitizeString(rawInput.breakTime, "휴게시간", 160),
    contractPeriod: sanitizeString(rawInput.contractPeriod, "계약기간", 160),
    conversionOpportunity: sanitizeString(rawInput.conversionOpportunity, "정규직 전환", 160),
    experienceLevel: sanitizeString(rawInput.experienceLevel, "경력조건", 160),
    educationLevel: sanitizeString(rawInput.educationLevel, "학력조건", 160),
    headcount: sanitizeString(rawInput.headcount, "모집인원", 80),
    benefits: sanitizeBenefits(rawInput.benefits),
    nearbyTransit: sanitizeString(rawInput.nearbyTransit, "인근 교통", 200),
    detailedLocation: sanitizeString(rawInput.detailedLocation, "상세 근무지", 300),
    applicationDeadline: sanitizeDeadline(rawInput.applicationDeadline),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.update(update);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!data) {
    throw new JobOperationalDetailsServiceError(
      "공고 상세조건 저장 결과를 확인할 수 없습니다.",
      500,
      "JOB_DETAIL_READBACK_FAILED"
    );
  }
  return toView(jobId, data);
}

export { B2BAuthorizationError };
