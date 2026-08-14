import type {
  ApplicationSource,
  ApplicationStage,
} from "../../types";

import {
  B2BAuthorizationError,
} from "./b2bAuthorization";

import {
  CandidateCrmServiceError,
  getB2BCandidateDetail,
} from "./candidateCrmService";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class CandidatePlacementServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_PLACEMENT_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "CandidatePlacementServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CandidatePlacementItem {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  stage: ApplicationStage;
  source: ApplicationSource;
  jobTitle: string;
  company: string;
  appliedAt: string | null;
  updatedAt: string | null;
  lastActivityAt: string | null;
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

function requireString(
  value: unknown,
  label: string,
  code: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new CandidatePlacementServiceError(
      `${label} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }

  return value.trim();
}

function normalizeStage(
  value: unknown
): ApplicationStage {
  if (
    typeof value !== "string" ||
    !APPLICATION_STAGES.has(
      value as ApplicationStage
    )
  ) {
    throw new CandidatePlacementServiceError(
      "지원 단계 정보가 올바르지 않습니다.",
      409,
      "APPLICATION_STAGE_INVALID"
    );
  }

  return value as ApplicationStage;
}

function normalizeSource(
  value: unknown
): ApplicationSource {
  if (
    typeof value !== "string" ||
    !APPLICATION_SOURCES.has(
      value as ApplicationSource
    )
  ) {
    throw new CandidatePlacementServiceError(
      "지원 경로 정보가 올바르지 않습니다.",
      409,
      "APPLICATION_SOURCE_INVALID"
    );
  }

  return value as ApplicationSource;
}

function timestampToIsoString(
  value: unknown
): string | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const timestamp = value as {
    toDate?: () => Date;
  };

  if (
    typeof timestamp.toDate !== "function"
  ) {
    return null;
  }

  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

export async function listB2BCandidatePlacements(
  actorUid: string,
  candidateIdInput: string
): Promise<CandidatePlacementItem[]> {
  const candidateId = candidateIdInput.trim();

  if (!candidateId) {
    throw new CandidatePlacementServiceError(
      "후보자 ID가 필요합니다.",
      400,
      "CANDIDATE_ID_REQUIRED"
    );
  }

  let candidateOrganizationId: string;

  try {
    const candidate = await getB2BCandidateDetail(
      actorUid,
      candidateId
    );

    candidateOrganizationId = candidate.organizationId;
  } catch (error) {
    if (error instanceof CandidateCrmServiceError) {
      throw new CandidatePlacementServiceError(
        error.message,
        error.status,
        error.code
      );
    }

    if (error instanceof B2BAuthorizationError) {
      throw error;
    }

    throw error;
  }

  const db = getFirebaseAdminDb();

  const snapshot = await db
    .collection("applications")
    .where("candidateId", "==", candidateId)
    .get();

  return snapshot.docs
    .map((document) => {
      const data = document.data();

      if (
        data.organizationId !==
        candidateOrganizationId
      ) {
        return null;
      }

      const jobSnapshot =
        typeof data.jobSnapshot === "object" &&
        data.jobSnapshot !== null
          ? data.jobSnapshot as Record<string, unknown>
          : {};

      return {
        applicationId: requireString(
          data.applicationId || document.id,
          "지원 ID",
          "APPLICATION_ID_MISSING"
        ),
        candidateId,
        jobId: requireString(
          data.jobId,
          "공고 ID",
          "APPLICATION_JOB_MISSING"
        ),
        organizationId: candidateOrganizationId,
        recruiterId: requireString(
          data.recruiterId,
          "담당 리쿠르터",
          "APPLICATION_RECRUITER_MISSING"
        ),
        stage: normalizeStage(data.stage),
        source: normalizeSource(data.source),
        jobTitle: requireString(
          jobSnapshot.title,
          "공고명",
          "APPLICATION_JOB_TITLE_MISSING"
        ),
        company: requireString(
          jobSnapshot.company,
          "기업명",
          "APPLICATION_JOB_COMPANY_MISSING"
        ),
        appliedAt: timestampToIsoString(
          data.appliedAt
        ),
        updatedAt: timestampToIsoString(
          data.updatedAt
        ),
        lastActivityAt: timestampToIsoString(
          data.lastActivityAt
        ),
      } satisfies CandidatePlacementItem;
    })
    .filter(
      (item): item is CandidatePlacementItem =>
        item !== null
    )
    .sort((a, b) => {
      const aTime = a.appliedAt
        ? Date.parse(a.appliedAt)
        : 0;
      const bTime = b.appliedAt
        ? Date.parse(b.appliedAt)
        : 0;

      return bTime - aTime;
    });
}
