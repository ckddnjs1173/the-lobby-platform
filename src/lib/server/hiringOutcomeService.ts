import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  ApplicationStage,
  HiringOutcomeStatus,
  HiringOutcomeView,
} from "../../types";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class HiringOutcomeServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "HIRING_OUTCOME_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "HiringOutcomeServiceError";
    this.status = status;
    this.code = code;
  }
}

interface RecordHiringOutcomeInput {
  status?: unknown;
  note?: unknown;
  plannedStartDate?: unknown;
}

const ACTIVE_OR_HOLD_STAGES =
  new Set<ApplicationStage>([
    "NEW",
    "REVIEWING",
    "CONTACTED",
    "RECOMMEND_PENDING",
    "RECOMMENDED",
    "DOCUMENT_SCREEN",
    "INTERVIEW",
    "OFFER",
    "HOLD",
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
  data: DocumentData,
  key: string,
  code: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new HiringOutcomeServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }

  return value.trim();
}

function assertTenantAccess(
  actor: B2BActor,
  organizationId: string
): void {
  if (
    actor.role === "RECRUITER" &&
    actor.organizationId !== organizationId
  ) {
    throw new HiringOutcomeServiceError(
      "다른 조직의 채용 결과를 변경할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

function parseStatus(
  value: unknown
): HiringOutcomeStatus {
  if (
    value !== "HIRED" &&
    value !== "REJECTED"
  ) {
    throw new HiringOutcomeServiceError(
      "채용 결과는 HIRED 또는 REJECTED만 사용할 수 있습니다.",
      400,
      "INVALID_HIRING_OUTCOME"
    );
  }

  return value;
}

function sanitizeNote(
  value: unknown,
  required: boolean
): string {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      throw new HiringOutcomeServiceError(
        "최종 결과 사유를 입력해주세요.",
        400,
        "HIRING_OUTCOME_NOTE_REQUIRED"
      );
    }

    return "";
  }

  if (typeof value !== "string") {
    throw new HiringOutcomeServiceError(
      "최종 결과 메모 형식이 올바르지 않습니다.",
      400,
      "INVALID_HIRING_OUTCOME_NOTE"
    );
  }

  const note = value.trim();

  if (
    required &&
    !note
  ) {
    throw new HiringOutcomeServiceError(
      "최종 결과 사유를 입력해주세요.",
      400,
      "HIRING_OUTCOME_NOTE_REQUIRED"
    );
  }

  if (note.length > 2000) {
    throw new HiringOutcomeServiceError(
      "최종 결과 메모는 2,000자를 초과할 수 없습니다.",
      400,
      "HIRING_OUTCOME_NOTE_TOO_LONG"
    );
  }

  return note;
}

function parsePlannedStartDate(
  value: unknown,
  status: HiringOutcomeStatus
): string | null {
  if (status !== "HIRED") {
    return null;
  }

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new HiringOutcomeServiceError(
      "입사 예정일 형식이 올바르지 않습니다.",
      400,
      "INVALID_PLANNED_START_DATE"
    );
  }

  const date = new Date(
    `${value}T00:00:00Z`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new HiringOutcomeServiceError(
      "입사 예정일 형식이 올바르지 않습니다.",
      400,
      "INVALID_PLANNED_START_DATE"
    );
  }

  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new HiringOutcomeServiceError(
      "존재하지 않는 입사 예정일입니다.",
      400,
      "INVALID_PLANNED_START_DATE"
    );
  }

  return value;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function timestampToIsoString(
  value: unknown
): string {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return "";
  }

  const timestamp = value as {
    toDate?: () => Date;
  };

  if (
    typeof timestamp.toDate !== "function"
  ) {
    return "";
  }

  try {
    return timestamp
      .toDate()
      .toISOString();
  } catch {
    return "";
  }
}

function toHiringOutcomeView(
  value: unknown
): HiringOutcomeView | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.status !== "HIRED" &&
    value.status !== "REJECTED"
  ) {
    return null;
  }

  if (!isNonEmptyString(value.decidedBy)) {
    return null;
  }

  const decidedAt =
    timestampToIsoString(
      value.decidedAt
    );

  if (!decidedAt) {
    return null;
  }

  return {
    status:
      value.status,
    decidedAt,
    decidedBy:
      value.decidedBy.trim(),
    note:
      typeof value.note === "string"
        ? value.note.trim()
        : "",
    plannedStartDate:
      typeof value.plannedStartDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        value.plannedStartDate
      )
        ? value.plannedStartDate
        : null,
  };
}

export async function recordApplicationHiringOutcome(
  actorUid: string,
  applicationIdInput: string,
  rawInput: RecordHiringOutcomeInput
): Promise<HiringOutcomeView> {
  const actor =
    await requireB2BActor(
      actorUid
    );

  const applicationId =
    applicationIdInput.trim();

  if (!applicationId) {
    throw new HiringOutcomeServiceError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  const status =
    parseStatus(
      rawInput.status
    );

  const note =
    sanitizeNote(
      rawInput.note,
      status === "REJECTED"
    );

  const plannedStartDate =
    parsePlannedStartDate(
      rawInput.plannedStartDate,
      status
    );

  const db =
    getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const stageEventRef = db
    .collection("appEvents")
    .doc();
  const outcomeEventRef = db
    .collection("appEvents")
    .doc();

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );

      if (!applicationSnapshot.exists) {
        throw new HiringOutcomeServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new HiringOutcomeServiceError(
          "지원 내역 데이터가 비어 있습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      const organizationId =
        requireString(
          applicationData,
          "organizationId",
          "APPLICATION_ORGANIZATION_MISSING"
        );

      assertTenantAccess(
        actor,
        organizationId
      );

      if (
        isRecord(
          applicationData.hiringOutcome
        )
      ) {
        throw new HiringOutcomeServiceError(
          "이미 최종 채용 결과가 기록되어 있습니다.",
          409,
          "HIRING_OUTCOME_ALREADY_RECORDED"
        );
      }

      const currentStage =
        applicationData.stage as ApplicationStage;

      if (
        status === "HIRED" &&
        currentStage !== "OFFER"
      ) {
        throw new HiringOutcomeServiceError(
          "입사 확정은 처우협의(OFFER) 단계에서만 처리할 수 있습니다.",
          409,
          "HIRED_REQUIRES_OFFER_STAGE"
        );
      }

      if (
        status === "REJECTED" &&
        !ACTIVE_OR_HOLD_STAGES.has(
          currentStage
        )
      ) {
        throw new HiringOutcomeServiceError(
          "현재 단계에서는 불합격 결과를 기록할 수 없습니다.",
          409,
          "REJECTED_OUTCOME_NOT_ALLOWED"
        );
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        applicationRef,
        {
          stage:
            status satisfies ApplicationStage,
          hiringOutcome: {
            status,
            decidedAt:
              serverTimestamp,
            decidedBy:
              actor.uid,
            note,
            plannedStartDate,
          },
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        stageEventRef,
        {
          eventId:
            stageEventRef.id,
          applicationId,
          organizationId,
          type:
            "STAGE_CHANGED",
          fromStage:
            currentStage,
          toStage:
            status,
          changedBy:
            actor.uid,
          note:
            note ||
            (status === "HIRED"
              ? "최종 합격 및 입사를 확정했습니다."
              : "최종 불합격을 확정했습니다."),
          metadata: {
            transitionKind:
              "HIRING_OUTCOME",
          },
          createdAt:
            serverTimestamp,
        }
      );

      transaction.set(
        outcomeEventRef,
        {
          eventId:
            outcomeEventRef.id,
          applicationId,
          organizationId,
          type:
            "HIRING_OUTCOME_RECORDED",
          changedBy:
            actor.uid,
          note:
            note ||
            (status === "HIRED"
              ? "최종 합격 및 입사를 확정했습니다."
              : "최종 불합격을 확정했습니다."),
          metadata: {
            status,
            plannedStartDate,
          },
          createdAt:
            serverTimestamp,
        }
      );
    }
  );

  const applicationSnapshot =
    await applicationRef.get();
  const applicationData =
    applicationSnapshot.data();
  const outcome =
    applicationData
      ? toHiringOutcomeView(
          applicationData.hiringOutcome
        )
      : null;

  if (!outcome) {
    throw new HiringOutcomeServiceError(
      "채용 결과 저장 후 데이터를 확인할 수 없습니다.",
      500,
      "HIRING_OUTCOME_READBACK_FAILED"
    );
  }

  return outcome;
}
