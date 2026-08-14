import {
  createHash,
} from "node:crypto";

import {
  FieldValue,
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
  EmailProviderError,
  sendEmailWithProvider,
} from "./emailProvider";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class ApplicationCommunicationServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "APPLICATION_COMMUNICATION_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "ApplicationCommunicationServiceError";
    this.status = status;
    this.code = code;
  }
}

export type ApplicationCommunicationStatus =
  | "PENDING"
  | "SENT"
  | "FAILED";

export interface ApplicationCommunicationView {
  communicationId: string;
  applicationId: string;
  organizationId: string;
  candidateId: string;
  channel: "EMAIL";
  status: ApplicationCommunicationStatus;
  to: string;
  subject: string;
  body: string;
  provider: string | null;
  providerMessageId: string | null;
  requestedBy: string;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
}

interface SendApplicationEmailInput {
  requestId?: unknown;
  subject?: unknown;
  body?: unknown;
}

interface AuthorizedApplicationContext {
  actor: B2BActor;
  applicationId: string;
  organizationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  company: string;
}

type CommunicationClaim =
  | {
      kind: "ALREADY_SENT";
      communication: ApplicationCommunicationView;
    }
  | {
      kind: "DELIVER";
      context: AuthorizedApplicationContext;
    };

const REQUEST_ID_PATTERN =
  /^[A-Za-z0-9_-]{8,100}$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAFE_PENDING_RETRY_WINDOW_MS =
  23 * 60 * 60 * 1000;

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
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

function requireString(
  data: DocumentData,
  key: string,
  code: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new ApplicationCommunicationServiceError(
      `${key} 정보가 누락되어 있습니다.`,
      409,
      code
    );
  }

  return value.trim();
}

function normalizeApplicationId(
  value: string
): string {
  const applicationId = value.trim();

  if (!applicationId) {
    throw new ApplicationCommunicationServiceError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  return applicationId;
}

function parseRequestId(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !REQUEST_ID_PATTERN.test(value.trim())
  ) {
    throw new ApplicationCommunicationServiceError(
      "이메일 발송 요청 ID 형식이 올바르지 않습니다.",
      400,
      "INVALID_COMMUNICATION_REQUEST_ID"
    );
  }

  return value.trim();
}

function parseSubject(
  value: unknown
): string {
  if (typeof value !== "string") {
    throw new ApplicationCommunicationServiceError(
      "이메일 제목을 입력해주세요.",
      400,
      "EMAIL_SUBJECT_REQUIRED"
    );
  }

  const subject = value.trim();

  if (!subject) {
    throw new ApplicationCommunicationServiceError(
      "이메일 제목을 입력해주세요.",
      400,
      "EMAIL_SUBJECT_REQUIRED"
    );
  }

  if (subject.length > 200) {
    throw new ApplicationCommunicationServiceError(
      "이메일 제목은 200자를 초과할 수 없습니다.",
      400,
      "EMAIL_SUBJECT_TOO_LONG"
    );
  }

  return subject;
}

function parseBody(
  value: unknown
): string {
  if (typeof value !== "string") {
    throw new ApplicationCommunicationServiceError(
      "이메일 본문을 입력해주세요.",
      400,
      "EMAIL_BODY_REQUIRED"
    );
  }

  const body = value.trim();

  if (!body) {
    throw new ApplicationCommunicationServiceError(
      "이메일 본문을 입력해주세요.",
      400,
      "EMAIL_BODY_REQUIRED"
    );
  }

  if (body.length > 10_000) {
    throw new ApplicationCommunicationServiceError(
      "이메일 본문은 10,000자를 초과할 수 없습니다.",
      400,
      "EMAIL_BODY_TOO_LONG"
    );
  }

  return body;
}

function assertTenantAccess(
  actor: B2BActor,
  organizationId: string
): void {
  if (
    actor.role === "RECRUITER" &&
    actor.organizationId !== organizationId
  ) {
    throw new ApplicationCommunicationServiceError(
      "다른 조직의 지원자에게 연락할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
}

function escapeHtml(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(
  value: string
): string {
  return escapeHtml(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "<br />");
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

  if (typeof timestamp.toDate !== "function") {
    return null;
  }

  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function timestampToMillis(
  value: unknown
): number | null {
  const iso = timestampToIsoString(value);

  if (!iso) {
    return null;
  }

  const milliseconds = Date.parse(iso);

  return Number.isFinite(milliseconds)
    ? milliseconds
    : null;
}

function toCommunicationView(
  communicationId: string,
  data: DocumentData,
  expectedApplicationId: string,
  expectedOrganizationId: string
): ApplicationCommunicationView | null {
  if (
    data.applicationId !== expectedApplicationId ||
    data.organizationId !== expectedOrganizationId ||
    data.channel !== "EMAIL" ||
    !isNonEmptyString(data.candidateId) ||
    !isNonEmptyString(data.to) ||
    !isNonEmptyString(data.subject) ||
    !isNonEmptyString(data.body) ||
    !isNonEmptyString(data.requestedBy)
  ) {
    return null;
  }

  if (
    data.status !== "PENDING" &&
    data.status !== "SENT" &&
    data.status !== "FAILED"
  ) {
    return null;
  }

  return {
    communicationId,
    applicationId: expectedApplicationId,
    organizationId: expectedOrganizationId,
    candidateId: data.candidateId.trim(),
    channel: "EMAIL",
    status: data.status,
    to: data.to.trim(),
    subject: data.subject.trim(),
    body: data.body.trim(),
    provider:
      isNonEmptyString(data.provider)
        ? data.provider.trim()
        : null,
    providerMessageId:
      isNonEmptyString(data.providerMessageId)
        ? data.providerMessageId.trim()
        : null,
    requestedBy: data.requestedBy.trim(),
    attempts:
      Number.isFinite(data.attempts)
        ? Math.max(0, Math.floor(data.attempts))
        : 0,
    errorCode:
      isNonEmptyString(data.errorCode)
        ? data.errorCode.trim()
        : null,
    errorMessage:
      isNonEmptyString(data.errorMessage)
        ? data.errorMessage.trim()
        : null,
    createdAt: timestampToIsoString(data.createdAt),
    updatedAt: timestampToIsoString(data.updatedAt),
    sentAt: timestampToIsoString(data.sentAt),
    failedAt: timestampToIsoString(data.failedAt),
  };
}

function buildAuthorizedApplicationContext(
  actor: B2BActor,
  applicationId: string,
  data: DocumentData
): AuthorizedApplicationContext {
  const organizationId = requireString(
    data,
    "organizationId",
    "APPLICATION_ORGANIZATION_MISSING"
  );

  assertTenantAccess(actor, organizationId);

  const candidateId = requireString(
    data,
    "candidateId",
    "APPLICATION_CANDIDATE_MISSING"
  );

  if (!isRecord(data.candidateSnapshot)) {
    throw new ApplicationCommunicationServiceError(
      "지원자 연락처 스냅샷을 확인할 수 없습니다.",
      409,
      "CANDIDATE_SNAPSHOT_MISSING"
    );
  }

  const candidateEmail =
    isNonEmptyString(data.candidateSnapshot.email)
      ? data.candidateSnapshot.email.trim()
      : "";

  if (
    !candidateEmail ||
    !EMAIL_PATTERN.test(candidateEmail)
  ) {
    throw new ApplicationCommunicationServiceError(
      "지원자 이메일 주소가 유효하지 않습니다.",
      409,
      "CANDIDATE_EMAIL_INVALID"
    );
  }

  const candidateName =
    isNonEmptyString(data.candidateSnapshot.name)
      ? data.candidateSnapshot.name.trim()
      : "지원자";

  const jobSnapshot =
    isRecord(data.jobSnapshot)
      ? data.jobSnapshot
      : {};

  return {
    actor,
    applicationId,
    organizationId,
    candidateId,
    candidateName,
    candidateEmail,
    jobTitle:
      isNonEmptyString(jobSnapshot.title)
        ? jobSnapshot.title.trim()
        : "채용 포지션",
    company:
      isNonEmptyString(jobSnapshot.company)
        ? jobSnapshot.company.trim()
        : "The Lobby 채용 고객사",
  };
}

async function getAuthorizedApplication(
  actorUid: string,
  applicationIdInput: string
): Promise<AuthorizedApplicationContext> {
  const actor = await requireB2BActor(actorUid);
  const applicationId =
    normalizeApplicationId(applicationIdInput);
  const db = getFirebaseAdminDb();
  const applicationSnapshot = await db
    .collection("applications")
    .doc(applicationId)
    .get();

  if (!applicationSnapshot.exists) {
    throw new ApplicationCommunicationServiceError(
      "존재하지 않는 지원 내역입니다.",
      404,
      "APPLICATION_NOT_FOUND"
    );
  }

  const data = applicationSnapshot.data();

  if (!data) {
    throw new ApplicationCommunicationServiceError(
      "지원 내역 데이터가 비어 있습니다.",
      409,
      "APPLICATION_DATA_MISSING"
    );
  }

  return buildAuthorizedApplicationContext(
    actor,
    applicationId,
    data
  );
}

export async function listApplicationCommunications(
  actorUid: string,
  applicationIdInput: string
): Promise<ApplicationCommunicationView[]> {
  const context = await getAuthorizedApplication(
    actorUid,
    applicationIdInput
  );
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("communications")
    .where(
      "applicationId",
      "==",
      context.applicationId
    )
    .get();

  return snapshot.docs
    .map((document) =>
      toCommunicationView(
        document.id,
        document.data(),
        context.applicationId,
        context.organizationId
      )
    )
    .filter(
      (item): item is ApplicationCommunicationView =>
        item !== null
    )
    .sort((a, b) => {
      const aTime = a.createdAt
        ? Date.parse(a.createdAt)
        : 0;
      const bTime = b.createdAt
        ? Date.parse(b.createdAt)
        : 0;

      return bTime - aTime;
    });
}

export async function sendApplicationEmail(
  actorUid: string,
  applicationIdInput: string,
  rawInput: SendApplicationEmailInput
): Promise<ApplicationCommunicationView> {
  const actor = await requireB2BActor(actorUid);
  const applicationId =
    normalizeApplicationId(applicationIdInput);
  const requestId = parseRequestId(rawInput.requestId);
  const subject = parseSubject(rawInput.subject);
  const body = parseBody(rawInput.body);

  const db = getFirebaseAdminDb();
  const applicationRef = db
    .collection("applications")
    .doc(applicationId);
  const communicationId =
    `${applicationId}__${requestId}`;
  const communicationRef = db
    .collection("communications")
    .doc(communicationId);
  const providerIdempotencyKey =
    `application-email/${createHash("sha256")
      .update(communicationId)
      .digest("hex")}`;

  const claim = await db.runTransaction<CommunicationClaim>(
    async (transaction) => {
      const [
        applicationSnapshot,
        existingSnapshot,
      ] = await Promise.all([
        transaction.get(applicationRef),
        transaction.get(communicationRef),
      ]);

      if (!applicationSnapshot.exists) {
        throw new ApplicationCommunicationServiceError(
          "존재하지 않는 지원 내역입니다.",
          404,
          "APPLICATION_NOT_FOUND"
        );
      }

      const applicationData =
        applicationSnapshot.data();

      if (!applicationData) {
        throw new ApplicationCommunicationServiceError(
          "지원 내역 데이터가 비어 있습니다.",
          409,
          "APPLICATION_DATA_MISSING"
        );
      }

      const context =
        buildAuthorizedApplicationContext(
          actor,
          applicationId,
          applicationData
        );

      if (existingSnapshot.exists) {
        const existingData =
          existingSnapshot.data();
        const existingView = existingData
          ? toCommunicationView(
              existingSnapshot.id,
              existingData,
              applicationId,
              context.organizationId
            )
          : null;

        if (!existingView) {
          throw new ApplicationCommunicationServiceError(
            "기존 이메일 발송 요청 데이터가 올바르지 않습니다.",
            409,
            "COMMUNICATION_DATA_INVALID"
          );
        }

        if (
          existingView.to !== context.candidateEmail ||
          existingView.subject !== subject ||
          existingView.body !== body
        ) {
          throw new ApplicationCommunicationServiceError(
            "동일한 요청 ID를 다른 이메일 내용에 재사용할 수 없습니다.",
            409,
            "COMMUNICATION_REQUEST_ID_REUSED"
          );
        }

        if (existingView.status === "SENT") {
          return {
            kind: "ALREADY_SENT",
            communication: existingView,
          };
        }

        if (existingView.status === "PENDING") {
          const updatedAt =
            timestampToMillis(existingData?.updatedAt);
          const age = updatedAt === null
            ? Number.POSITIVE_INFINITY
            : Date.now() - updatedAt;

          if (
            age < 0 ||
            age > SAFE_PENDING_RETRY_WINDOW_MS
          ) {
            throw new ApplicationCommunicationServiceError(
              "이전 이메일 발송의 최종 상태를 안전하게 확인할 수 없습니다. 새 요청으로 재발송하기 전에 provider 발송 이력을 확인해주세요.",
              409,
              "COMMUNICATION_DELIVERY_STATE_UNKNOWN"
            );
          }
        }

        transaction.update(
          communicationRef,
          {
            status: "PENDING",
            attempts: FieldValue.increment(1),
            errorCode: null,
            errorMessage: null,
            failedAt: null,
            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );

        return {
          kind: "DELIVER",
          context,
        };
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.set(
        communicationRef,
        {
          communicationId,
          applicationId,
          organizationId:
            context.organizationId,
          candidateId:
            context.candidateId,
          channel: "EMAIL",
          status: "PENDING",
          requestId,
          providerIdempotencyKey,
          to: context.candidateEmail,
          subject,
          body,
          provider: null,
          providerMessageId: null,
          requestedBy: actor.uid,
          attempts: 1,
          errorCode: null,
          errorMessage: null,
          createdAt: serverTimestamp,
          updatedAt: serverTimestamp,
          sentAt: null,
          failedAt: null,
        }
      );

      return {
        kind: "DELIVER",
        context,
      };
    }
  );

  if (claim.kind === "ALREADY_SENT") {
    return claim.communication;
  }

  const context = claim.context;

  let providerResult:
    Awaited<ReturnType<typeof sendEmailWithProvider>>;

  try {
    providerResult = await sendEmailWithProvider({
      to: context.candidateEmail,
      subject,
      text: body,
      html: `<div>${textToHtml(body)}</div>`,
      idempotencyKey: providerIdempotencyKey,
    });
  } catch (error) {
    const providerError =
      error instanceof EmailProviderError
        ? error
        : new EmailProviderError(
            "이메일 발송 중 알 수 없는 오류가 발생했습니다.",
            502,
            "EMAIL_PROVIDER_UNKNOWN_ERROR",
            true
          );

    try {
      await communicationRef.update({
        status: "FAILED",
        errorCode: providerError.code,
        errorMessage:
          providerError.message.slice(0, 500),
        failedAt:
          FieldValue.serverTimestamp(),
        updatedAt:
          FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error(
        "Communication failure state update failed:",
        updateError
      );
    }

    throw new ApplicationCommunicationServiceError(
      providerError.message,
      providerError.status,
      providerError.code
    );
  }

  const eventRef = db
    .collection("appEvents")
    .doc();

  await db.runTransaction(
    async (transaction) => {
      const [
        communicationSnapshot,
        applicationSnapshot,
      ] = await Promise.all([
        transaction.get(communicationRef),
        transaction.get(applicationRef),
      ]);

      if (!communicationSnapshot.exists) {
        throw new ApplicationCommunicationServiceError(
          "이메일 발송 기록을 찾을 수 없습니다.",
          500,
          "COMMUNICATION_RECORD_MISSING"
        );
      }

      const communicationData =
        communicationSnapshot.data();

      if (communicationData?.status === "SENT") {
        return;
      }

      const serverTimestamp =
        FieldValue.serverTimestamp();

      transaction.update(
        communicationRef,
        {
          status: "SENT",
          provider: providerResult.provider,
          providerMessageId:
            providerResult.messageId,
          errorCode: null,
          errorMessage: null,
          sentAt: serverTimestamp,
          failedAt: null,
          updatedAt: serverTimestamp,
        }
      );

      if (applicationSnapshot.exists) {
        transaction.update(
          applicationRef,
          {
            updatedAt: serverTimestamp,
            lastActivityAt: serverTimestamp,
          }
        );
      }

      transaction.set(
        eventRef,
        {
          eventId: eventRef.id,
          applicationId,
          organizationId:
            context.organizationId,
          type:
            "EMAIL_SENT" satisfies EventType,
          changedBy: actor.uid,
          note:
            `지원자에게 이메일을 발송했습니다: ${subject}`,
          metadata: {
            communicationId,
            candidateId: context.candidateId,
            candidateName: context.candidateName,
            recipient: context.candidateEmail,
            jobTitle: context.jobTitle,
            company: context.company,
            provider: providerResult.provider,
            providerMessageId:
              providerResult.messageId,
          },
          createdAt: serverTimestamp,
        }
      );
    }
  );

  const finalSnapshot =
    await communicationRef.get();
  const finalData = finalSnapshot.data();
  const finalView = finalData
    ? toCommunicationView(
        finalSnapshot.id,
        finalData,
        applicationId,
        context.organizationId
      )
    : null;

  if (!finalView) {
    throw new ApplicationCommunicationServiceError(
      "이메일 발송 후 기록을 확인할 수 없습니다.",
      500,
      "COMMUNICATION_READBACK_FAILED"
    );
  }

  return finalView;
}
