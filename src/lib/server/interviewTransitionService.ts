import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  ApplicationStage,
} from "../../types";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

import type {
  InterviewMethod,
} from "./interviewService";

export class InterviewTransitionServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "INTERVIEW_TRANSITION_SERVICE_ERROR"
  ) {
    super(message);
    this.name =
      "InterviewTransitionServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface ScheduleInterviewTransitionResult {
  applicationId: string;
  interviewId: string;
  stage: "INTERVIEW";
  changedStage: boolean;
}

interface ScheduleInterviewTransitionInput {
  scheduledAt?: unknown;
  method?: unknown;
  location?: unknown;
  interviewer?: unknown;
  note?: unknown;
}

const INTERVIEW_METHODS:
  readonly InterviewMethod[] = [
    "ONSITE",
    "VIDEO",
    "PHONE",
  ];

const ALLOWED_SOURCE_STAGES:
  readonly ApplicationStage[] = [
    "RECOMMENDED",
    "DOCUMENT_SCREEN",
    "INTERVIEW",
  ];

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
    throw new InterviewTransitionServiceError(
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
    throw new InterviewTransitionServiceError(
      "다른 조직의 지원 내역에는 접근할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

function sanitizeOptionalText(
  value: unknown,
  maxLength: number,
  label: string
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new InterviewTransitionServiceError(
      `${label} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_TEXT_FIELD"
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.length >
    maxLength
  ) {
    throw new InterviewTransitionServiceError(
      `${label}는 ${maxLength.toLocaleString()}자를 초과할 수 없습니다.`,
      400,
      "TEXT_FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function parseMethod(
  value: unknown
): InterviewMethod {
  if (
    typeof value !== "string" ||
    !INTERVIEW_METHODS.includes(
      value as InterviewMethod
    )
  ) {
    throw new InterviewTransitionServiceError(
      "면접 방식이 올바르지 않습니다.",
      400,
      "INVALID_INTERVIEW_METHOD"
    );
  }

  return value as InterviewMethod;
}

function parseScheduledAt(
  value: unknown
): {
  date: Date;
  iso: string;
} {
  if (typeof value !== "string") {
    throw new InterviewTransitionServiceError(
      "면접 일시가 필요합니다.",
      400,
      "INTERVIEW_SCHEDULE_REQUIRED"
    );
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new InterviewTransitionServiceError(
      "면접 일시 형식이 올바르지 않습니다.",
      400,
      "INVALID_INTERVIEW_SCHEDULE"
    );
  }

  if (
    date.getTime() <=
    Date.now()
  ) {
    throw new InterviewTransitionServiceError(
      "면접 일시는 현재 시각 이후여야 합니다.",
      400,
      "INTERVIEW_SCHEDULE_NOT_FUTURE"
    );
  }

  const maxDate =
    Date.now() +
    366 * 24 * 60 * 60 * 1000;

  if (
    date.getTime() >
    maxDate
  ) {
    throw new InterviewTransitionServiceError(
      "면접 일정은 1년 이내로 등록해주세요.",
      400,
      "INTERVIEW_SCHEDULE_TOO_FAR"
    );
  }

  return {
    date,
    iso:
      date.toISOString(),
  };
}

export async function scheduleInterviewAndTransitionApplication(
  actorUid: string,
  applicationIdInput: string,
  rawInput: ScheduleInterviewTransitionInput
): Promise<ScheduleInterviewTransitionResult> {
  const actor =
    await requireB2BActor(
      actorUid
    );

  const applicationId =
    applicationIdInput.trim();

  if (!applicationId) {
    throw new InterviewTransitionServiceError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  const {
    date: scheduledDate,
    iso: scheduledAtIso,
  } = parseScheduledAt(
    rawInput.scheduledAt
  );

  const method =
    parseMethod(
      rawInput.method
    );

  const location =
    sanitizeOptionalText(
      rawInput.location,
      500,
      "면접 장소/링크"
    );

  const interviewer =
    sanitizeOptionalText(
      rawInput.interviewer,
      200,
      "면접관"
    );

  const note =
    sanitizeOptionalText(
      rawInput.note,
      2000,
      "면접 메모"
    );

  if (
    method === "ONSITE" &&
    !location
  ) {
    throw new InterviewTransitionServiceError(
      "대면 면접은 장소를 입력해주세요.",
      400,
      "INTERVIEW_LOCATION_REQUIRED"
    );
  }

  const db =
    getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const interviewRef = db
    .collection("interviews")
    .doc();
  const scheduleEventRef = db
    .collection("appEvents")
    .doc();
  const stageEventRef = db
    .collection("appEvents")
    .doc();

  let changedStage = false;

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );

      if (!applicationSnapshot.exists) {
        throw new InterviewTransitionServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new InterviewTransitionServiceError(
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

      const currentStage =
        applicationData.stage;

      if (
        !ALLOWED_SOURCE_STAGES.includes(
          currentStage as ApplicationStage
        )
      ) {
        throw new InterviewTransitionServiceError(
          "고객사 추천 또는 서류전형 단계에서 면접 일정을 확정한 뒤 면접 단계로 이동할 수 있습니다.",
          409,
          "INVALID_INTERVIEW_STAGE_TRANSITION"
        );
      }

      const candidateId =
        requireString(
          applicationData,
          "candidateId",
          "APPLICATION_CANDIDATE_MISSING"
        );
      const jobId =
        requireString(
          applicationData,
          "jobId",
          "APPLICATION_JOB_MISSING"
        );
      const recruiterId =
        requireString(
          applicationData,
          "recruiterId",
          "APPLICATION_RECRUITER_MISSING"
        );

      changedStage =
        currentStage !==
        "INTERVIEW";

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.set(
        interviewRef,
        {
          interviewId:
            interviewRef.id,
          applicationId,
          candidateId,
          jobId,
          organizationId,
          recruiterId,
          scheduledAt:
            Timestamp.fromDate(
              scheduledDate
            ),
          method,
          location,
          interviewer,
          note,
          status: "SCHEDULED",
          result: null,
          cancelReason: null,
          createdBy:
            actor.uid,
          createdAt:
            serverTimestamp,
          updatedAt:
            serverTimestamp,
        }
      );

      transaction.update(
        applicationRef,
        {
          ...(changedStage
            ? {
                stage:
                  "INTERVIEW" satisfies ApplicationStage,
              }
            : {}),
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      if (changedStage) {
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
              "INTERVIEW",
            changedBy:
              actor.uid,
            note:
              "면접 일정 확정과 함께 면접 단계로 이동했습니다.",
            metadata: {
              transitionKind:
                "INTERVIEW_SCHEDULED",
              interviewId:
                interviewRef.id,
            },
            createdAt:
              serverTimestamp,
          }
        );
      }

      transaction.set(
        scheduleEventRef,
        {
          eventId:
            scheduleEventRef.id,
          applicationId,
          organizationId,
          type:
            "INTERVIEW_SCHEDULED",
          changedBy:
            actor.uid,
          note:
            note ||
            "면접 일정을 등록했습니다.",
          metadata: {
            interviewId:
              interviewRef.id,
            scheduledAt:
              scheduledAtIso,
            method,
            location,
            interviewer,
          },
          createdAt:
            serverTimestamp,
        }
      );
    }
  );

  return {
    applicationId,
    interviewId:
      interviewRef.id,
    stage: "INTERVIEW",
    changedStage,
  };
}
