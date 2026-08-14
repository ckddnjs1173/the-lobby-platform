import type {
  ApplicationSource,
  ApplicationStage,
  ApplicationView,
} from "../../types";

import {
  requireB2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class ApplicationListServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 409,
    code = "APPLICATION_LIST_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "ApplicationListServiceError";
    this.status = status;
    this.code = code;
  }
}

const APPLICATION_STAGES = new Set<ApplicationStage>([
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "RECOMMEND_PENDING",
  "RECOMMENDED",
  "DOCUMENT_SCREEN",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "HOLD",
  "REJECTED",
  "CANCELED",
]);

const APPLICATION_SOURCES = new Set<ApplicationSource>([
  "B2C_WEB",
  "B2B_DIRECT",
  "HEADHUNTING",
  "REFERRAL",
]);

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function requireString(
  data: Record<string, unknown>,
  key: string,
  documentId: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new ApplicationListServiceError(
      `지원 내역 ${documentId}의 ${key} 정보가 누락되어 있습니다.`,
      409,
      "APPLICATION_LIST_DATA_INVALID"
    );
  }

  return value.trim();
}

function timestampToIsoString(
  value: unknown
): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const timestampLike = value as {
      toDate?: () => Date;
    };

    if (typeof timestampLike.toDate === "function") {
      try {
        return timestampLike.toDate().toISOString();
      } catch {
        return "";
      }
    }
  }

  return "";
}

function nestedString(
  value: unknown,
  key: string,
  fallback: string
): string {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return fallback;
  }

  const nestedValue =
    (value as Record<string, unknown>)[key];

  return isNonEmptyString(nestedValue)
    ? nestedValue.trim()
    : fallback;
}

function normalizeStage(
  value: unknown,
  documentId: string
): ApplicationStage {
  if (
    !isNonEmptyString(value) ||
    !APPLICATION_STAGES.has(value as ApplicationStage)
  ) {
    throw new ApplicationListServiceError(
      `지원 내역 ${documentId}의 단계 정보가 올바르지 않습니다.`,
      409,
      "APPLICATION_STAGE_INVALID"
    );
  }

  return value as ApplicationStage;
}

function normalizeSource(
  value: unknown,
  documentId: string
): ApplicationSource {
  if (
    !isNonEmptyString(value) ||
    !APPLICATION_SOURCES.has(value as ApplicationSource)
  ) {
    throw new ApplicationListServiceError(
      `지원 내역 ${documentId}의 유입 경로 정보가 올바르지 않습니다.`,
      409,
      "APPLICATION_SOURCE_INVALID"
    );
  }

  return value as ApplicationSource;
}

function toApplicationView(
  documentId: string,
  data: Record<string, unknown>
): ApplicationView {
  return {
    applicationId:
      isNonEmptyString(data.applicationId)
        ? data.applicationId.trim()
        : documentId,
    candidateId:
      requireString(data, "candidateId", documentId),
    jobId:
      requireString(data, "jobId", documentId),
    organizationId:
      requireString(data, "organizationId", documentId),
    recruiterId:
      requireString(data, "recruiterId", documentId),
    stage:
      normalizeStage(data.stage, documentId),
    source:
      normalizeSource(data.source, documentId),
    candidateName:
      nestedString(
        data.candidateSnapshot,
        "name",
        "이름 없음"
      ),
    candidatePhone:
      nestedString(
        data.candidateSnapshot,
        "phone",
        "-"
      ),
    candidateEmail:
      nestedString(
        data.candidateSnapshot,
        "email",
        "-"
      ),
    jobTitle:
      nestedString(
        data.jobSnapshot,
        "title",
        "공고명 없음"
      ),
    company:
      nestedString(
        data.jobSnapshot,
        "company",
        "기업명 없음"
      ),
    appliedAt:
      timestampToIsoString(data.appliedAt),
    updatedAt:
      timestampToIsoString(data.updatedAt),
    lastActivityAt:
      timestampToIsoString(data.lastActivityAt),
  };
}

export async function listB2BApplications(
  actorUid: string
): Promise<ApplicationView[]> {
  const actor = await requireB2BActor(actorUid);
  const db = getFirebaseAdminDb();
  const applicationsReference =
    db.collection("applications");

  const snapshot =
    actor.role === "RECRUITER"
      ? await applicationsReference
          .where(
            "organizationId",
            "==",
            actor.organizationId
          )
          .get()
      : await applicationsReference.get();

  return snapshot.docs
    .map((document) =>
      toApplicationView(
        document.id,
        document.data()
      )
    )
    .sort((a, b) => {
      const aTime = Date.parse(a.appliedAt);
      const bTime = Date.parse(b.appliedAt);

      return (
        (Number.isNaN(bTime) ? 0 : bTime) -
        (Number.isNaN(aTime) ? 0 : aTime)
      );
    });
}
