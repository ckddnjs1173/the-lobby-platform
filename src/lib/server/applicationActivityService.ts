import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import type {
  ApplicationStage,
  EventType,
} from "../../types";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class ApplicationActivityServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "APPLICATION_ACTIVITY_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "ApplicationActivityServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface ApplicationActivityItem {
  eventId: string;
  applicationId: string;
  organizationId: string;
  type: EventType;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage | null;
  changedBy: string;
  note: string | null;
  createdAt: string | null;
}

const EVENT_TYPES: readonly EventType[] = [
  "APPLICATION_CREATED",
  "STAGE_CHANGED",
  "NOTE_ADDED",
  "RECRUITER_ASSIGNED",
  "EMAIL_SENT",
  "INTERVIEW_SCHEDULED",
  "PROFILE_UPDATED",
];

const APPLICATION_STAGES: readonly ApplicationStage[] = [
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireString(
  data: DocumentData,
  key: string,
  errorCode: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new ApplicationActivityServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      errorCode
    );
  }

  return value.trim();
}

function normalizeApplicationId(applicationIdInput: string): string {
  const applicationId = applicationIdInput.trim();

  if (!applicationId) {
    throw new ApplicationActivityServiceError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  return applicationId;
}

function sanitizeRequiredNote(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApplicationActivityServiceError(
      "메모 내용을 입력해주세요.",
      400,
      "NOTE_REQUIRED"
    );
  }

  const note = value.trim();

  if (!note) {
    throw new ApplicationActivityServiceError(
      "메모 내용을 입력해주세요.",
      400,
      "NOTE_REQUIRED"
    );
  }

  if (note.length > 2000) {
    throw new ApplicationActivityServiceError(
      "메모는 2,000자를 초과할 수 없습니다.",
      400,
      "NOTE_TOO_LONG"
    );
  }

  return note;
}

function assertTenantAccess(
  actor: B2BActor,
  organizationId: string
): void {
  if (
    actor.role === "RECRUITER" &&
    actor.organizationId !== organizationId
  ) {
    throw new ApplicationActivityServiceError(
      "다른 조직의 지원 활동 내역에는 접근할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

function isEventType(value: unknown): value is EventType {
  return EVENT_TYPES.includes(value as EventType);
}

function isApplicationStage(value: unknown): value is ApplicationStage {
  return APPLICATION_STAGES.includes(value as ApplicationStage);
}

function timestampToIsoString(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const timestamp = value as {
    toDate?: () => Date;
  };

  if (typeof timestamp.toDate !== "function") {
    return null;
  }

  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function toActivityItem(
  eventId: string,
  data: DocumentData,
  expectedApplicationId: string,
  expectedOrganizationId: string
): ApplicationActivityItem | null {
  if (
    data.applicationId !== expectedApplicationId ||
    data.organizationId !== expectedOrganizationId ||
    !isEventType(data.type) ||
    !isNonEmptyString(data.changedBy)
  ) {
    return null;
  }

  return {
    eventId,
    applicationId: expectedApplicationId,
    organizationId: expectedOrganizationId,
    type: data.type,
    fromStage: isApplicationStage(data.fromStage) ? data.fromStage : null,
    toStage: isApplicationStage(data.toStage) ? data.toStage : null,
    changedBy: data.changedBy.trim(),
    note: isNonEmptyString(data.note) ? data.note.trim() : null,
    createdAt: timestampToIsoString(data.createdAt),
  };
}

async function getAuthorizedApplication(
  actorUid: string,
  applicationIdInput: string
) {
  const actor = await requireB2BActor(actorUid);
  const applicationId = normalizeApplicationId(applicationIdInput);
  const db = getFirebaseAdminDb();
  const applicationRef = db.collection("applications").doc(applicationId);
  const applicationSnapshot = await applicationRef.get();

  if (!applicationSnapshot.exists) {
    throw new ApplicationActivityServiceError(
      "존재하지 않는 지원 내역입니다.",
      404,
      "APPLICATION_NOT_FOUND"
    );
  }

  const applicationData = applicationSnapshot.data();

  if (!applicationData) {
    throw new ApplicationActivityServiceError(
      "지원 내역 데이터가 비어 있습니다.",
      409,
      "APPLICATION_DATA_MISSING"
    );
  }

  const organizationId = requireString(
    applicationData,
    "organizationId",
    "APPLICATION_ORGANIZATION_MISSING"
  );

  assertTenantAccess(actor, organizationId);

  return {
    actor,
    applicationId,
    organizationId,
    applicationRef,
  };
}

export async function listApplicationActivity(
  actorUid: string,
  applicationIdInput: string
): Promise<ApplicationActivityItem[]> {
  const {
    applicationId,
    organizationId,
  } = await getAuthorizedApplication(actorUid, applicationIdInput);

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("appEvents")
    .where("applicationId", "==", applicationId)
    .get();

  return snapshot.docs
    .map((document) =>
      toActivityItem(
        document.id,
        document.data(),
        applicationId,
        organizationId
      )
    )
    .filter(
      (item): item is ApplicationActivityItem => item !== null
    )
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

export async function addApplicationNote(
  actorUid: string,
  applicationIdInput: string,
  noteInput: unknown
): Promise<ApplicationActivityItem> {
  const note = sanitizeRequiredNote(noteInput);
  const actor = await requireB2BActor(actorUid);
  const applicationId = normalizeApplicationId(applicationIdInput);
  const db = getFirebaseAdminDb();
  const applicationRef = db.collection("applications").doc(applicationId);
  const eventRef = db.collection("appEvents").doc();

  let organizationId = "";

  await db.runTransaction(async (transaction) => {
    const applicationSnapshot = await transaction.get(applicationRef);

    if (!applicationSnapshot.exists) {
      throw new ApplicationActivityServiceError(
        "존재하지 않는 지원 내역입니다.",
        404,
        "APPLICATION_NOT_FOUND"
      );
    }

    const applicationData = applicationSnapshot.data();

    if (!applicationData) {
      throw new ApplicationActivityServiceError(
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

    assertTenantAccess(actor, organizationId);

    const serverTimestamp = FieldValue.serverTimestamp();

    transaction.update(applicationRef, {
      updatedAt: serverTimestamp,
      lastActivityAt: serverTimestamp,
    });

    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      organizationId,
      type: "NOTE_ADDED" satisfies EventType,
      changedBy: actor.uid,
      note,
      createdAt: serverTimestamp,
    });
  });

  const eventSnapshot = await eventRef.get();
  const eventData = eventSnapshot.data();
  const activity = eventData
    ? toActivityItem(
        eventSnapshot.id,
        eventData,
        applicationId,
        organizationId
      )
    : null;

  if (!activity) {
    throw new ApplicationActivityServiceError(
      "메모 저장 후 활동 내역을 확인할 수 없습니다.",
      500,
      "NOTE_EVENT_READBACK_FAILED"
    );
  }

  return activity;
}
