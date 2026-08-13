import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  EventType,
} from "../../types";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class ApplicationOperationsServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "APPLICATION_OPERATIONS_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "ApplicationOperationsServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface AssignableRecruiter {
  uid: string;
  name: string;
  email: string;
  organizationId: string;
}

export interface AssignApplicationRecruiterResult {
  applicationId: string;
  recruiterId: string;
  recruiterName: string;
  changed: boolean;
}

export type InterviewMethod =
  | "ONSITE"
  | "VIDEO"
  | "PHONE";

export type InterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED";

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
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ScheduleInterviewInput {
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
    throw new ApplicationOperationsServiceError(
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
    throw new ApplicationOperationsServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }

  return value.trim();
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
    throw new ApplicationOperationsServiceError(
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
    throw new ApplicationOperationsServiceError(
      `${label}는 ${maxLength.toLocaleString()}자를 초과할 수 없습니다.`,
      400,
      "TEXT_FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function assertTenantAccess(
  actor: B2BActor,
  organizationId: string
): void {
  if (
    actor.role === "RECRUITER" &&
    actor.organizationId !== organizationId
  ) {
    throw new ApplicationOperationsServiceError(
      "다른 조직의 지원 내역에는 접근할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

function resolveOrganizationId(
  actor: B2BActor,
  organizationIdInput?: string
): string {
  if (actor.role === "RECRUITER") {
    if (!actor.organizationId) {
      throw new ApplicationOperationsServiceError(
        "리쿠르터 조직 정보를 확인할 수 없습니다.",
        403,
        "RECRUITER_ORGANIZATION_MISSING"
      );
    }

    if (
      organizationIdInput?.trim() &&
      organizationIdInput.trim() !== actor.organizationId
    ) {
      throw new ApplicationOperationsServiceError(
        "다른 조직의 담당자 목록에는 접근할 수 없습니다.",
        403,
        "TENANT_ACCESS_DENIED"
      );
    }

    return actor.organizationId;
  }

  const organizationId =
    organizationIdInput?.trim() || "";

  if (!organizationId) {
    throw new ApplicationOperationsServiceError(
      "조직 ID가 필요합니다.",
      400,
      "ORGANIZATION_ID_REQUIRED"
    );
  }

  return organizationId;
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
    throw new ApplicationOperationsServiceError(
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
    throw new ApplicationOperationsServiceError(
      "면접 일시가 필요합니다.",
      400,
      "INTERVIEW_SCHEDULE_REQUIRED"
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApplicationOperationsServiceError(
      "면접 일시 형식이 올바르지 않습니다.",
      400,
      "INVALID_INTERVIEW_SCHEDULE"
    );
  }

  if (date.getTime() <= Date.now()) {
    throw new ApplicationOperationsServiceError(
      "면접 일시는 현재 시각 이후여야 합니다.",
      400,
      "INTERVIEW_SCHEDULE_NOT_FUTURE"
    );
  }

  const maxDate =
    Date.now() +
    366 * 24 * 60 * 60 * 1000;

  if (date.getTime() > maxDate) {
    throw new ApplicationOperationsServiceError(
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
    timestampToIsoString(data.scheduledAt);

  if (!scheduledAt) {
    return null;
  }

  return {
    interviewId,
    applicationId: data.applicationId.trim(),
    candidateId: data.candidateId.trim(),
    jobId: data.jobId.trim(),
    organizationId: data.organizationId.trim(),
    recruiterId: data.recruiterId.trim(),
    scheduledAt,
    method: data.method,
    location: isNonEmptyString(data.location)
      ? data.location.trim()
      : null,
    interviewer: isNonEmptyString(data.interviewer)
      ? data.interviewer.trim()
      : null,
    note: isNonEmptyString(data.note)
      ? data.note.trim()
      : null,
    status: data.status,
    createdBy: data.createdBy.trim(),
    createdAt:
      timestampToIsoString(data.createdAt),
    updatedAt:
      timestampToIsoString(data.updatedAt),
  };
}

export async function listAssignableRecruiters(
  actorUid: string,
  organizationIdInput?: string
): Promise<AssignableRecruiter[]> {
  const actor =
    await requireB2BActor(actorUid);

  const organizationId =
    resolveOrganizationId(
      actor,
      organizationIdInput
    );

  const db = getFirebaseAdminDb();

  const snapshot = await db
    .collection("users")
    .where(
      "organizationId",
      "==",
      organizationId
    )
    .get();

  return snapshot.docs
    .map((document) => {
      const data = document.data();

      if (
        data.role !== "RECRUITER" ||
        data.status !== "ACTIVE"
      ) {
        return null;
      }

      return {
        uid: document.id,
        name: isNonEmptyString(data.name)
          ? data.name.trim()
          : document.id,
        email: isNonEmptyString(data.email)
          ? data.email.trim().toLowerCase()
          : "",
        organizationId,
      } satisfies AssignableRecruiter;
    })
    .filter(
      (item): item is AssignableRecruiter =>
        item !== null
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "ko"
      )
    );
}

export async function assignApplicationRecruiter(
  actorUid: string,
  applicationIdInput: string,
  recruiterIdInput: string,
  noteInput?: unknown
): Promise<AssignApplicationRecruiterResult> {
  const actor =
    await requireB2BActor(actorUid);

  const applicationId = normalizeId(
    applicationIdInput,
    "지원 ID",
    "APPLICATION_ID_REQUIRED"
  );

  const recruiterId = normalizeId(
    recruiterIdInput,
    "담당자 ID",
    "RECRUITER_ID_REQUIRED"
  );

  const note = sanitizeOptionalText(
    noteInput,
    2000,
    "담당자 변경 메모"
  );

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);

  const recruiterRef = db
    .collection("users")
    .doc(recruiterId);

  const eventRef = db
    .collection("appEvents")
    .doc();

  let recruiterName = recruiterId;
  let changed = false;

  await db.runTransaction(
    async (transaction) => {
      const applicationSnapshot =
        await transaction.get(
          applicationRef
        );

      const recruiterSnapshot =
        await transaction.get(
          recruiterRef
        );

      if (!applicationSnapshot.exists) {
        throw new ApplicationOperationsServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new ApplicationOperationsServiceError(
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

      if (!recruiterSnapshot.exists) {
        throw new ApplicationOperationsServiceError(
          "지정한 담당자를 찾을 수 없습니다.",
          404,
          "RECRUITER_NOT_FOUND"
        );
      }

      const recruiterData =
        recruiterSnapshot.data();

      if (
        !recruiterData ||
        recruiterData.role !== "RECRUITER" ||
        recruiterData.status !== "ACTIVE"
      ) {
        throw new ApplicationOperationsServiceError(
          "활성 상태의 Recruiter만 담당자로 지정할 수 있습니다.",
          409,
          "RECRUITER_NOT_ASSIGNABLE"
        );
      }

      const targetOrganizationId =
        requireString(
          recruiterData,
          "organizationId",
          "RECRUITER_ORGANIZATION_MISSING"
        );

      if (
        targetOrganizationId !==
        organizationId
      ) {
        throw new ApplicationOperationsServiceError(
          "지원 내역과 같은 조직의 Recruiter만 담당자로 지정할 수 있습니다.",
          403,
          "ASSIGNEE_TENANT_MISMATCH"
        );
      }

      recruiterName =
        isNonEmptyString(
          recruiterData.name
        )
          ? recruiterData.name.trim()
          : recruiterId;

      const currentRecruiterId =
        requireString(
          applicationData,
          "recruiterId",
          "APPLICATION_RECRUITER_MISSING"
        );

      if (
        currentRecruiterId ===
        recruiterId
      ) {
        return;
      }

      changed = true;

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        applicationRef,
        {
          recruiterId,
          updatedAt: serverTimestamp,
          lastActivityAt: serverTimestamp,
        }
      );

      transaction.set(
        eventRef,
        {
          eventId: eventRef.id,
          applicationId,
          organizationId,
          type:
            "RECRUITER_ASSIGNED" satisfies EventType,
          changedBy: actor.uid,
          note:
            note ||
            `담당자를 ${recruiterName}(으)로 변경했습니다.`,
          metadata: {
            fromRecruiterId:
              currentRecruiterId,
            toRecruiterId:
              recruiterId,
            toRecruiterName:
              recruiterName,
          },
          createdAt: serverTimestamp,
        }
      );
    }
  );

  return {
    applicationId,
    recruiterId,
    recruiterName,
    changed,
  };
}

async function getAuthorizedApplication(
  actorUid: string,
  applicationIdInput: string
) {
  const actor =
    await requireB2BActor(actorUid);

  const applicationId = normalizeId(
    applicationIdInput,
    "지원 ID",
    "APPLICATION_ID_REQUIRED"
  );

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);

  const applicationSnapshot =
    await applicationRef.get();

  if (!applicationSnapshot.exists) {
    throw new ApplicationOperationsServiceError(
      "존재하지 않는 지원 내역입니다.",
      404,
      "APPLICATION_NOT_FOUND"
    );
  }

  const applicationData =
    applicationSnapshot.data();

  if (!applicationData) {
    throw new ApplicationOperationsServiceError(
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
    actor,
    applicationId,
    applicationData,
    organizationId,
    applicationRef,
  };
}

export async function listApplicationInterviews(
  actorUid: string,
  applicationIdInput: string
): Promise<ApplicationInterviewView[]> {
  const {
    applicationId,
    organizationId,
  } = await getAuthorizedApplication(
    actorUid,
    applicationIdInput
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
    .sort((a, b) =>
      Date.parse(a.scheduledAt) -
      Date.parse(b.scheduledAt)
    );
}

export async function scheduleApplicationInterview(
  actorUid: string,
  applicationIdInput: string,
  rawInput: ScheduleInterviewInput
): Promise<ApplicationInterviewView> {
  const actor =
    await requireB2BActor(actorUid);

  const applicationId = normalizeId(
    applicationIdInput,
    "지원 ID",
    "APPLICATION_ID_REQUIRED"
  );

  const {
    date: scheduledDate,
    iso: scheduledAtIso,
  } = parseScheduledAt(
    rawInput.scheduledAt
  );

  const method = parseInterviewMethod(
    rawInput.method
  );

  const location = sanitizeOptionalText(
    rawInput.location,
    500,
    "면접 장소/링크"
  );

  const interviewer = sanitizeOptionalText(
    rawInput.interviewer,
    200,
    "면접관"
  );

  const note = sanitizeOptionalText(
    rawInput.note,
    2000,
    "면접 메모"
  );

  if (
    method === "ONSITE" &&
    !location
  ) {
    throw new ApplicationOperationsServiceError(
      "대면 면접은 장소를 입력해주세요.",
      400,
      "INTERVIEW_LOCATION_REQUIRED"
    );
  }

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
        throw new ApplicationOperationsServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new ApplicationOperationsServiceError(
          "지원 내역 데이터가 비어 있습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      organizationId = requireString(
        applicationData,
        "organizationId",
        "APPLICATION_ORGANIZATION_MISSING"
      );

      assertTenantAccess(
        actor,
        organizationId
      );

      const candidateId = requireString(
        applicationData,
        "candidateId",
        "APPLICATION_CANDIDATE_MISSING"
      );

      const jobId = requireString(
        applicationData,
        "jobId",
        "APPLICATION_JOB_MISSING"
      );

      const recruiterId = requireString(
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
              scheduledDate
            ),
          method,
          location,
          interviewer,
          note,
          status:
            "SCHEDULED" satisfies InterviewStatus,
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
          eventId: eventRef.id,
          applicationId,
          organizationId,
          type:
            "INTERVIEW_SCHEDULED" satisfies EventType,
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

  const interviewSnapshot =
    await interviewRef.get();

  const interviewData =
    interviewSnapshot.data();

  const interview = interviewData
    ? toInterviewView(
        interviewSnapshot.id,
        interviewData
      )
    : null;

  if (
    !interview ||
    interview.organizationId !==
      organizationId
  ) {
    throw new ApplicationOperationsServiceError(
      "면접 일정 저장 후 데이터를 확인할 수 없습니다.",
      500,
      "INTERVIEW_READBACK_FAILED"
    );
  }

  return interview;
}
