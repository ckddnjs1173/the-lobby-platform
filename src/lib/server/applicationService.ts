import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import {
  type ApplicationStage,
} from "../../types";

import {
  requireB2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

// ============================================================================
// Error
// ============================================================================

export class ApplicationServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "APPLICATION_SERVICE_ERROR"
  ) {
    super(message);

    this.name = "ApplicationServiceError";
    this.status = status;
    this.code = code;
  }
}

// ============================================================================
// Result Types
// ============================================================================

export interface CreateApplicationResult {
  applicationId: string;
  stage: ApplicationStage;
}

export interface UpdateApplicationStageResult {
  applicationId: string;
  stage: ApplicationStage;
  changed: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const APPLICATION_STAGES: readonly ApplicationStage[] =
  [
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
  ];


// ============================================================================
// Helpers
// ============================================================================

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function requireString(
  data: DocumentData,
  key: string,
  errorCode: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new ApplicationServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      errorCode
    );
  }

  return value.trim();
}

function isApplicationStage(
  value: unknown
): value is ApplicationStage {
  return APPLICATION_STAGES.includes(
    value as ApplicationStage
  );
}

function sanitizeNote(
  value?: string
): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 2000) {
    throw new ApplicationServiceError(
      "메모는 2,000자를 초과할 수 없습니다.",
      400,
      "NOTE_TOO_LONG"
    );
  }

  return trimmed;
}

// ============================================================================
// Candidate Resolver
// ============================================================================

/**
 * Firebase Auth UID로 The Lobby Candidate를 찾는다.
 *
 * B2C 가입 사용자는 authUid가 정확히 하나의 Candidate와
 * 연결되어 있어야 한다.
 */
async function resolveCandidateIdByAuthUid(
  authUid: string
): Promise<string> {
  const db = getFirebaseAdminDb();

  const snapshot = await db
    .collection("candidates")
    .where("authUid", "==", authUid)
    .limit(2)
    .get();

  if (snapshot.empty) {
    throw new ApplicationServiceError(
      "로그인 계정과 연결된 구직자 프로필이 없습니다.",
      404,
      "CANDIDATE_NOT_FOUND"
    );
  }

  if (snapshot.size > 1) {
    throw new ApplicationServiceError(
      "하나의 계정에 여러 Candidate가 연결되어 있습니다.",
      409,
      "DUPLICATE_AUTH_CANDIDATE"
    );
  }

  return snapshot.docs[0].id;
}

// ============================================================================
// Create Application
// ============================================================================

/**
 * B2C 원클릭 지원
 *
 * 서버가 직접 다음을 결정한다.
 *
 * - candidateId
 * - source = B2C_WEB
 * - organizationId
 * - recruiterId
 * - changedBy
 * - timestamp
 *
 * 클라이언트는 jobId만 전달한다.
 */
export async function createB2CApplication(
  authUid: string,
  jobIdInput: string
): Promise<CreateApplicationResult> {
  const db = getFirebaseAdminDb();

  const jobId = jobIdInput.trim();

  if (!jobId) {
    throw new ApplicationServiceError(
      "지원할 공고 ID가 필요합니다.",
      400,
      "JOB_ID_REQUIRED"
    );
  }

  const candidateId =
    await resolveCandidateIdByAuthUid(
      authUid
    );

  const applicationId =
    `${candidateId}__${jobId}`;

  const candidateRef = db
    .collection("candidates")
    .doc(candidateId);

  const jobRef = db
    .collection("jobs")
    .doc(jobId);

  const applicationRef = db
    .collection("applications")
    .doc(applicationId);

  const eventRef = db
    .collection("appEvents")
    .doc();

  return db.runTransaction(
    async (transaction) => {
      /**
       * 모든 Read를 Write보다 먼저 수행한다.
       */
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );

      if (applicationSnapshot.exists) {
        throw new ApplicationServiceError(
          "이미 해당 공고에 지원하셨습니다.",
          409,
          "DUPLICATE_APPLICATION"
        );
      }

      const jobSnapshot =
        await transaction.get(jobRef);

      if (!jobSnapshot.exists) {
        throw new ApplicationServiceError(
          "존재하지 않는 채용 공고입니다.",
          404,
          "JOB_NOT_FOUND"
        );
      }

      const candidateSnapshot =
        await transaction.get(candidateRef);

      if (!candidateSnapshot.exists) {
        throw new ApplicationServiceError(
          "구직자 정보를 찾을 수 없습니다.",
          404,
          "CANDIDATE_NOT_FOUND"
        );
      }

      const jobData =
        jobSnapshot.data();

      const candidateData =
        candidateSnapshot.data();

      if (
        !jobData ||
        !candidateData
      ) {
        throw new ApplicationServiceError(
          "지원 처리에 필요한 데이터가 없습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      /**
       * Candidate 소유권을 서버에서 다시 검증한다.
       */
      if (
        candidateData.authUid !== authUid
      ) {
        throw new ApplicationServiceError(
          "해당 Candidate에 대한 지원 권한이 없습니다.",
          403,
          "CANDIDATE_OWNERSHIP_MISMATCH"
        );
      }

      if (
        candidateData.accountStatus !==
        "ACTIVE"
      ) {
        throw new ApplicationServiceError(
          "활성 상태의 구직자만 지원할 수 있습니다.",
          403,
          "CANDIDATE_NOT_ACTIVE"
        );
      }

      if (jobData.status !== "OPEN") {
        throw new ApplicationServiceError(
          "현재 지원할 수 없는 공고입니다.",
          409,
          "JOB_NOT_OPEN"
        );
      }

      const organizationId =
        requireString(
          jobData,
          "organizationId",
          "JOB_ORGANIZATION_MISSING"
        );

      const recruiterId =
        requireString(
          jobData,
          "recruiterId",
          "JOB_RECRUITER_MISSING"
        );

      const candidateName =
        requireString(
          candidateData,
          "name",
          "CANDIDATE_NAME_MISSING"
        );

      const candidatePhone =
        requireString(
          candidateData,
          "phone",
          "CANDIDATE_PHONE_MISSING"
        );

      const candidateEmail =
        requireString(
          candidateData,
          "email",
          "CANDIDATE_EMAIL_MISSING"
        );

      const jobTitle =
        requireString(
          jobData,
          "title",
          "JOB_TITLE_MISSING"
        );

      const jobCompany =
        requireString(
          jobData,
          "company",
          "JOB_COMPANY_MISSING"
        );

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.set(
        applicationRef,
        {
          applicationId,

          candidateId,

          jobId,

          organizationId,

          recruiterId,

          stage:
            "NEW" satisfies ApplicationStage,

          source: "B2C_WEB",

          candidateSnapshot: {
            name: candidateName,
            phone: candidatePhone,
            email: candidateEmail,
          },

          jobSnapshot: {
            title: jobTitle,
            company: jobCompany,
          },

          appliedAt:
            serverTimestamp,

          updatedAt:
            serverTimestamp,

          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId: eventRef.id,

          applicationId,

          organizationId,

          type:
            "APPLICATION_CREATED",

          toStage:
            "NEW" satisfies ApplicationStage,

          /**
           * 서버가 검증한 Firebase UID.
           */
          changedBy: authUid,

          note:
            "공고 원클릭 지원 완료",

          createdAt:
            serverTimestamp,
        }
      );

      return {
        applicationId,
        stage:
          "NEW" as ApplicationStage,
      };
    }
  );
}

// ============================================================================
// Update Application Stage
// ============================================================================

/**
 * B2B 지원 단계 변경.
 *
 * 클라이언트가 보내는 changedBy 값을 사용하지 않는다.
 * 서버에서 검증된 Firebase UID로 강제한다.
 */
export async function updateApplicationStage(
  actorUid: string,
  applicationIdInput: string,
  newStageInput: unknown,
  noteInput?: string
): Promise<UpdateApplicationStageResult> {
  const db = getFirebaseAdminDb();

  const applicationId =
    applicationIdInput.trim();

  if (!applicationId) {
    throw new ApplicationServiceError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  if (
    !isApplicationStage(
      newStageInput
    )
  ) {
    throw new ApplicationServiceError(
      "올바르지 않은 지원 단계입니다.",
      400,
      "INVALID_APPLICATION_STAGE"
    );
  }

  const newStage =
    newStageInput;

  const note =
    sanitizeNote(noteInput);

  const actor =
    await requireB2BActor(
      actorUid
    );

  const applicationRef = db
    .collection("applications")
    .doc(applicationId);

  const eventRef = db
    .collection("appEvents")
    .doc();

  return db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );

      if (!applicationSnapshot.exists) {
        throw new ApplicationServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new ApplicationServiceError(
          "지원 내역 데이터가 비어 있습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      const applicationOrganizationId =
        requireString(
          applicationData,
          "organizationId",
          "APPLICATION_ORGANIZATION_MISSING"
        );

      /**
       * ADMIN은 전체 조직 접근 가능.
       *
       * RECRUITER는 자신의 organizationId와
       * Application.organizationId가 일치해야 한다.
       */
      if (
        actor.role === "RECRUITER" &&
        actor.organizationId !==
          applicationOrganizationId
      ) {
        throw new ApplicationServiceError(
          "다른 조직의 지원 내역을 변경할 수 없습니다.",
          403,
          "TENANT_ACCESS_DENIED"
        );
      }

      const oldStage =
        applicationData.stage;

      if (
        !isApplicationStage(oldStage)
      ) {
        throw new ApplicationServiceError(
          "기존 지원 단계 데이터가 올바르지 않습니다.",
          409,
          "INVALID_EXISTING_STAGE"
        );
      }

      if (oldStage === newStage) {
        return {
          applicationId,
          stage: oldStage,
          changed: false,
        };
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      /**
       * Stage 변경 시 다른 핵심 필드는 건드리지 않는다.
       */
      transaction.update(
        applicationRef,
        {
          stage: newStage,
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId: eventRef.id,

          applicationId,

          organizationId:
            applicationOrganizationId,

          type:
            "STAGE_CHANGED",

          fromStage: oldStage,

          toStage: newStage,

          /**
           * Firebase Admin이 검증한 실제 요청자 UID.
           */
          changedBy: actor.uid,

          note:
            note ||
            `단계를 ${oldStage}에서 ${newStage}(으)로 변경했습니다.`,

          createdAt:
            serverTimestamp,
        }
      );

      return {
        applicationId,
        stage: newStage,
        changed: true,
      };
    }
  );
}