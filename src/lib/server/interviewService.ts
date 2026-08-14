import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class InterviewServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "INTERVIEW_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "InterviewServiceError";
    this.status = status;
    this.code = code;
  }
}

export type InterviewMethod =
  | "ONSITE"
  | "VIDEO"
  | "PHONE";

export type InterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED";

export type InterviewResult =
  | "PASS"
  | "FAIL"
  | "HOLD"
  | "NO_SHOW";

export interface ApplicationInterviewView {
  interviewId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  scheduledAt: string;
  method: InterviewMethod;
  location: string | null;
  interviewer: string | null;
  note: string | null;
  status: InterviewStatus;
  result: InterviewResult | null;
  cancelReason: string | null;
  createdBy: string;
  completedBy: string | null;
  canceledBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
}

interface InterviewScheduleInput {
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

const INTERVIEW_STATUSES:
  readonly InterviewStatus[] = [
    "SCHEDULED",
    "COMPLETED",
    "CANCELED",
  ];

const INTERVIEW_RESULTS:
  readonly InterviewResult[] = [
    "PASS",
    "FAIL",
    "HOLD",
    "NO_SHOW",
  ];

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function normalizeId(
  value: string,
  label: string,
  code: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InterviewServiceError(
      `${label}가 필요합니다.`,
      400,
      code
    );
  }

  return normalized;
}

function requireString(
  data: DocumentData,
  key: string,
  code: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new InterviewServiceError(
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
    throw new InterviewServiceError(
      "다른 조직의 면접 정보에는 접근할 수 없습니다.",
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
    throw new InterviewServiceError(
      `${label} 형식이 올바르지 않습니다.`,
      400,
      "INVALID_TEXT_FIELD"
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new InterviewServiceError(
      `${label}는 ${maxLength.toLocaleString()}자를 초과할 수 없습니다.`,
      400,
      "TEXT_FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function requireReason(
  value: unknown,
  label: string
): string {
  const reason =
    sanitizeOptionalText(
      value,
      2000,
      label
    );

  if (!reason) {
    throw new InterviewServiceError(
      `${label}를 입력해주세요.`,
      400,
      "INTERVIEW_REASON_REQUIRED"
    );
  }

  return reason;
}

function parseInterviewMethod(
  value: unknown
): InterviewMethod {
  if (
    typeof value !== "string" ||
    !INTERVIEW_METHODS.includes(
      value as InterviewMethod
    )
  ) {
    throw new InterviewServiceError(
      "면접 방식이 올바르지 않습니다.",
      400,
      "INVALID_INTERVIEW_METHOD"
    );
  }

  return value as InterviewMethod;
}

function parseInterviewResult(
  value: unknown
): InterviewResult {
  if (
    typeof value !== "string" ||
    !INTERVIEW_RESULTS.includes(
      value as InterviewResult
    )
  ) {
    throw new InterviewServiceError(
      "면접 결과가 올바르지 않습니다.",
      400,
      "INVALID_INTERVIEW_RESULT"
    );
  }

  return value as InterviewResult;
}

function parseScheduledAt(
  value: unknown
): {
  date: Date;
  iso: string;
} {
  if (typeof value !== "string") {
    throw new InterviewServiceError(
      "면접 일시가 필요합니다.",
      400,
      "INTERVIEW_SCHEDULE_REQUIRED"
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new InterviewServiceError(
      "면접 일시 형식이 올바르지 않습니다.",
      400,
      "INVALID_INTERVIEW_SCHEDULE"
    );
  }

  if (date.getTime() <= Date.now()) {
    throw new InterviewServiceError(
      "면접 일시는 현재 시각 이후여야 합니다.",
      400,
      "INTERVIEW_SCHEDULE_NOT_FUTURE"
    );
  }

  const maxDate =
    Date.now() +
    366 * 24 * 60 * 60 * 1000;

  if (date.getTime() > maxDate) {
    throw new InterviewServiceError(
      "면접 일정은 1년 이내로 등록해주세요.",
      400,
      "INTERVIEW_SCHEDULE_TOO_FAR"
    );
  }

  return {
    date,
    iso: date.toISOString(),
  };
}

function normalizeScheduleInput(
  rawInput: InterviewScheduleInput
) {
  const {
    date: scheduledDate,
    iso: scheduledAtIso,
  } = parseScheduledAt(
    rawInput.scheduledAt
  );

  const method =
    parseInterviewMethod(
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
    throw new InterviewServiceError(
      "대면 면접은 장소를 입력해주세요.",
      400,
      "INTERVIEW_LOCATION_REQUIRED"
    );
  }

  return {
    scheduledDate,
    scheduledAtIso,
    method,
    location,
    interviewer,
    note,
  };
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
    return timestamp
      .toDate()
      .toISOString();
  } catch {
    return null;
  }
}

function isInterviewMethod(
  value: unknown
): value is InterviewMethod {
  return INTERVIEW_METHODS.includes(
    value as InterviewMethod
  );
}

function isInterviewStatus(
  value: unknown
): value is InterviewStatus {
  return INTERVIEW_STATUSES.includes(
    value as InterviewStatus
  );
}

function isInterviewResult(
  value: unknown
): value is InterviewResult {
  return INTERVIEW_RESULTS.includes(
    value as InterviewResult
  );
}

function toInterviewView(
  interviewId: string,
  data: DocumentData
): ApplicationInterviewView | null {
  if (
    !isNonEmptyString(data.applicationId) ||
    !isNonEmptyString(data.candidateId) ||
    !isNonEmptyString(data.jobId) ||
    !isNonEmptyString(data.organizationId) ||
    !isNonEmptyString(data.recruiterId) ||
    !isInterviewMethod(data.method) ||
    !isInterviewStatus(data.status) ||
    !isNonEmptyString(data.createdBy)
  ) {
    return null;
  }

  const scheduledAt =
    timestampToIsoString(
      data.scheduledAt
    );

  if (!scheduledAt) {
    return null;
  }

  return {
    interviewId,
    applicationId:
      data.applicationId.trim(),
    candidateId:
      data.candidateId.trim(),
    jobId:
      data.jobId.trim(),
    organizationId:
      data.organizationId.trim(),
    recruiterId:
      data.recruiterId.trim(),
    scheduledAt,
    method:
      data.method,
    location:
      isNonEmptyString(data.location)
        ? data.location.trim()
        : null,
    interviewer:
      isNonEmptyString(data.interviewer)
        ? data.interviewer.trim()
        : null,
    note:
      isNonEmptyString(data.note)
        ? data.note.trim()
        : null,
    status:
      data.status,
    result:
      isInterviewResult(data.result)
        ? data.result
        : null,
    cancelReason:
      isNonEmptyString(data.cancelReason)
        ? data.cancelReason.trim()
        : null,
    createdBy:
      data.createdBy.trim(),
    completedBy:
      isNonEmptyString(data.completedBy)
        ? data.completedBy.trim()
        : null,
    canceledBy:
      isNonEmptyString(data.canceledBy)
        ? data.canceledBy.trim()
        : null,
    createdAt:
      timestampToIsoString(data.createdAt),
    updatedAt:
      timestampToIsoString(data.updatedAt),
    completedAt:
      timestampToIsoString(data.completedAt),
    canceledAt:
      timestampToIsoString(data.canceledAt),
  };
}

async function readAuthorizedApplication(
  actor: B2BActor,
  applicationId: string
) {
  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);

  const applicationSnapshot =
    await applicationRef.get();

  if (!applicationSnapshot.exists) {
    throw new InterviewServiceError(
      "존재하지 않는 지원 내역입니다.",
      404,
      "APPLICATION_NOT_FOUND"
    );
  }

  const applicationData =
    applicationSnapshot.data();

  if (!applicationData) {
    throw new InterviewServiceError(
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

  return {
    applicationRef,
    applicationData,
    organizationId,
  };
}

function assertInterviewOwnership(
  interviewData: DocumentData,
  applicationId: string,
  organizationId: string
): void {
  if (
    interviewData.applicationId !==
      applicationId ||
    interviewData.organizationId !==
      organizationId
  ) {
    throw new InterviewServiceError(
      "지원 내역과 면접 데이터의 소유 관계가 일치하지 않습니다.",
      403,
      "INTERVIEW_OWNERSHIP_MISMATCH"
    );
  }
}

async function readInterviewView(
  interviewId: string,
  expectedOrganizationId: string
): Promise<ApplicationInterviewView> {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("interviews")
    .doc(interviewId)
    .get();

  const data = snapshot.data();
  const view = data
    ? toInterviewView(
        snapshot.id,
        data
      )
    : null;

  if (
    !view ||
    view.organizationId !==
      expectedOrganizationId
  ) {
    throw new InterviewServiceError(
      "면접 저장 후 데이터를 확인할 수 없습니다.",
      500,
      "INTERVIEW_READBACK_FAILED"
    );
  }

  return view;
}

export async function listApplicationInterviews(
  actorUid: string,
  applicationIdInput: string
): Promise<ApplicationInterviewView[]> {
  const actor =
    await requireB2BActor(
      actorUid
    );

  const applicationId =
    normalizeId(
      applicationIdInput,
      "지원 ID",
      "APPLICATION_ID_REQUIRED"
    );

  const {
    organizationId,
  } = await readAuthorizedApplication(
    actor,
    applicationId
  );

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("interviews")
    .where(
      "applicationId",
      "==",
      applicationId
    )
    .get();

  return snapshot.docs
    .map((document) =>
      toInterviewView(
        document.id,
        document.data()
      )
    )
    .filter(
      (
        interview
      ): interview is ApplicationInterviewView =>
        interview !== null &&
        interview.organizationId ===
          organizationId
    )
    .sort(
      (a, b) =>
        Date.parse(a.scheduledAt) -
        Date.parse(b.scheduledAt)
    );
}

export async function scheduleApplicationInterview(
  actorUid: string,
  applicationIdInput: string,
  rawInput: InterviewScheduleInput
): Promise<ApplicationInterviewView> {
  const actor =
    await requireB2BActor(
      actorUid
    );

  const applicationId =
    normalizeId(
      applicationIdInput,
      "지원 ID",
      "APPLICATION_ID_REQUIRED"
    );

  const normalized =
    normalizeScheduleInput(
      rawInput
    );

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const interviewRef = db
    .collection("interviews")
    .doc();
  const eventRef = db
    .collection("appEvents")
    .doc();

  let organizationId = "";

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );

      if (!applicationSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new InterviewServiceError(
          "지원 내역 데이터가 비어 있습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      organizationId =
        requireString(
          applicationData,
          "organizationId",
          "APPLICATION_ORGANIZATION_MISSING"
        );

      assertTenantAccess(
        actor,
        organizationId
      );

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
              normalized.scheduledDate
            ),
          method:
            normalized.method,
          location:
            normalized.location,
          interviewer:
            normalized.interviewer,
          note:
            normalized.note,
          status:
            "SCHEDULED" satisfies InterviewStatus,
          result:
            null,
          cancelReason:
            null,
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
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId:
            eventRef.id,
          applicationId,
          organizationId,
          type:
            "INTERVIEW_SCHEDULED",
          changedBy:
            actor.uid,
          note:
            normalized.note ||
            "면접 일정을 등록했습니다.",
          metadata: {
            interviewId:
              interviewRef.id,
            scheduledAt:
              normalized.scheduledAtIso,
            method:
              normalized.method,
            location:
              normalized.location,
            interviewer:
              normalized.interviewer,
          },
          createdAt:
            serverTimestamp,
        }
      );
    }
  );

  return readInterviewView(
    interviewRef.id,
    organizationId
  );
}

export async function updateApplicationInterview(
  actorUid: string,
  applicationIdInput: string,
  interviewIdInput: string,
  rawInput: InterviewScheduleInput
): Promise<ApplicationInterviewView> {
  const actor =
    await requireB2BActor(
      actorUid
    );
  const applicationId =
    normalizeId(
      applicationIdInput,
      "지원 ID",
      "APPLICATION_ID_REQUIRED"
    );
  const interviewId =
    normalizeId(
      interviewIdInput,
      "면접 ID",
      "INTERVIEW_ID_REQUIRED"
    );
  const normalized =
    normalizeScheduleInput(
      rawInput
    );

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const interviewRef = db
    .collection("interviews")
    .doc(interviewId);
  const eventRef = db
    .collection("appEvents")
    .doc();

  let organizationId = "";

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );
      const interviewSnapshot =
        await transaction.get(
          interviewRef
        );

      if (!applicationSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }
      if (!interviewSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 면접 일정입니다.",
          404,
          "INTERVIEW_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();
      const interviewData =
        interviewSnapshot.data();

      if (!applicationData || !interviewData) {
        throw new InterviewServiceError(
          "면접 수정에 필요한 데이터가 없습니다.",
          409,
          "INTERVIEW_DATA_MISSING"
        );
      }

      organizationId =
        requireString(
          applicationData,
          "organizationId",
          "APPLICATION_ORGANIZATION_MISSING"
        );
      assertTenantAccess(
        actor,
        organizationId
      );
      assertInterviewOwnership(
        interviewData,
        applicationId,
        organizationId
      );

      if (
        interviewData.status !==
        "SCHEDULED"
      ) {
        throw new InterviewServiceError(
          "예정 상태의 면접만 수정할 수 있습니다.",
          409,
          "INTERVIEW_NOT_EDITABLE"
        );
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        interviewRef,
        {
          scheduledAt:
            Timestamp.fromDate(
              normalized.scheduledDate
            ),
          method:
            normalized.method,
          location:
            normalized.location,
          interviewer:
            normalized.interviewer,
          note:
            normalized.note,
          updatedAt:
            serverTimestamp,
        }
      );

      transaction.update(
        applicationRef,
        {
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId:
            eventRef.id,
          applicationId,
          organizationId,
          type:
            "INTERVIEW_UPDATED",
          changedBy:
            actor.uid,
          note:
            normalized.note ||
            "면접 일정을 수정했습니다.",
          metadata: {
            interviewId,
            scheduledAt:
              normalized.scheduledAtIso,
            method:
              normalized.method,
            location:
              normalized.location,
            interviewer:
              normalized.interviewer,
          },
          createdAt:
            serverTimestamp,
        }
      );
    }
  );

  return readInterviewView(
    interviewId,
    organizationId
  );
}

export async function cancelApplicationInterview(
  actorUid: string,
  applicationIdInput: string,
  interviewIdInput: string,
  reasonInput: unknown
): Promise<ApplicationInterviewView> {
  const actor =
    await requireB2BActor(actorUid);
  const applicationId =
    normalizeId(
      applicationIdInput,
      "지원 ID",
      "APPLICATION_ID_REQUIRED"
    );
  const interviewId =
    normalizeId(
      interviewIdInput,
      "면접 ID",
      "INTERVIEW_ID_REQUIRED"
    );
  const cancelReason =
    requireReason(
      reasonInput,
      "면접 취소 사유"
    );

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const interviewRef = db
    .collection("interviews")
    .doc(interviewId);
  const eventRef = db
    .collection("appEvents")
    .doc();

  let organizationId = "";

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );
      const interviewSnapshot =
        await transaction.get(
          interviewRef
        );

      if (!applicationSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }
      if (!interviewSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 면접 일정입니다.",
          404,
          "INTERVIEW_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();
      const interviewData =
        interviewSnapshot.data();

      if (!applicationData || !interviewData) {
        throw new InterviewServiceError(
          "면접 취소에 필요한 데이터가 없습니다.",
          409,
          "INTERVIEW_DATA_MISSING"
        );
      }

      organizationId =
        requireString(
          applicationData,
          "organizationId",
          "APPLICATION_ORGANIZATION_MISSING"
        );
      assertTenantAccess(
        actor,
        organizationId
      );
      assertInterviewOwnership(
        interviewData,
        applicationId,
        organizationId
      );

      if (
        interviewData.status !==
        "SCHEDULED"
      ) {
        throw new InterviewServiceError(
          "예정 상태의 면접만 취소할 수 있습니다.",
          409,
          "INTERVIEW_NOT_CANCELABLE"
        );
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        interviewRef,
        {
          status:
            "CANCELED" satisfies InterviewStatus,
          cancelReason,
          canceledBy:
            actor.uid,
          canceledAt:
            serverTimestamp,
          updatedAt:
            serverTimestamp,
        }
      );

      transaction.update(
        applicationRef,
        {
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId:
            eventRef.id,
          applicationId,
          organizationId,
          type:
            "INTERVIEW_CANCELED",
          changedBy:
            actor.uid,
          note:
            cancelReason,
          metadata: {
            interviewId,
          },
          createdAt:
            serverTimestamp,
        }
      );
    }
  );

  return readInterviewView(
    interviewId,
    organizationId
  );
}

export async function completeApplicationInterview(
  actorUid: string,
  applicationIdInput: string,
  interviewIdInput: string,
  resultInput: unknown,
  noteInput?: unknown
): Promise<ApplicationInterviewView> {
  const actor =
    await requireB2BActor(actorUid);
  const applicationId =
    normalizeId(
      applicationIdInput,
      "지원 ID",
      "APPLICATION_ID_REQUIRED"
    );
  const interviewId =
    normalizeId(
      interviewIdInput,
      "면접 ID",
      "INTERVIEW_ID_REQUIRED"
    );
  const result =
    parseInterviewResult(
      resultInput
    );
  const note =
    sanitizeOptionalText(
      noteInput,
      2000,
      "면접 결과 메모"
    );

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const interviewRef = db
    .collection("interviews")
    .doc(interviewId);
  const eventRef = db
    .collection("appEvents")
    .doc();

  let organizationId = "";

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );
      const interviewSnapshot =
        await transaction.get(
          interviewRef
        );

      if (!applicationSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }
      if (!interviewSnapshot.exists) {
        throw new InterviewServiceError(
          "존재하지 않는 면접 일정입니다.",
          404,
          "INTERVIEW_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();
      const interviewData =
        interviewSnapshot.data();

      if (!applicationData || !interviewData) {
        throw new InterviewServiceError(
          "면접 완료 처리에 필요한 데이터가 없습니다.",
          409,
          "INTERVIEW_DATA_MISSING"
        );
      }

      organizationId =
        requireString(
          applicationData,
          "organizationId",
          "APPLICATION_ORGANIZATION_MISSING"
        );
      assertTenantAccess(
        actor,
        organizationId
      );
      assertInterviewOwnership(
        interviewData,
        applicationId,
        organizationId
      );

      if (
        interviewData.status !==
        "SCHEDULED"
      ) {
        throw new InterviewServiceError(
          "예정 상태의 면접만 완료 처리할 수 있습니다.",
          409,
          "INTERVIEW_NOT_COMPLETABLE"
        );
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        interviewRef,
        {
          status:
            "COMPLETED" satisfies InterviewStatus,
          result,
          ...(note
            ? {
                note,
              }
            : {}),
          completedBy:
            actor.uid,
          completedAt:
            serverTimestamp,
          updatedAt:
            serverTimestamp,
        }
      );

      transaction.update(
        applicationRef,
        {
          updatedAt:
            serverTimestamp,
          lastActivityAt:
            serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId:
            eventRef.id,
          applicationId,
          organizationId,
          type:
            "INTERVIEW_COMPLETED",
          changedBy:
            actor.uid,
          note:
            note ||
            `면접 결과를 ${result}(으)로 기록했습니다.`,
          metadata: {
            interviewId,
            result,
          },
          createdAt:
            serverTimestamp,
        }
      );
    }
  );

  return readInterviewView(
    interviewId,
    organizationId
  );
}
