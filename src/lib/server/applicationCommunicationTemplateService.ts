import type {
  DocumentData,
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

export class ApplicationCommunicationTemplateServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "APPLICATION_COMMUNICATION_TEMPLATE_SERVICE_ERROR"
  ) {
    super(message);
    this.name =
      "ApplicationCommunicationTemplateServiceError";
    this.status = status;
    this.code = code;
  }
}

export type ApplicationCommunicationTemplateKey =
  | "FIRST_CONTACT"
  | "FOLLOW_UP"
  | "INTERVIEW_SCHEDULED"
  | "OFFER_FOLLOW_UP"
  | "HIRED_CONFIRMATION"
  | "REJECTION_NOTICE";

export interface ApplicationCommunicationTemplateView {
  key: ApplicationCommunicationTemplateKey;
  label: string;
  subject: string;
  body: string;
  recommended: boolean;
  reason: string;
}

interface ApplicationTemplateContext {
  actor: B2BActor;
  applicationId: string;
  organizationId: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  stage: ApplicationStage;
  hiringOutcome: Record<string, unknown> | null;
}

interface LatestInterviewContext {
  scheduledAt: string;
  method: "ONSITE" | "VIDEO" | "PHONE";
  location: string | null;
  interviewer: string | null;
}

const APPLICATION_STAGES:
  readonly ApplicationStage[] = [
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

function isApplicationStage(
  value: unknown
): value is ApplicationStage {
  return APPLICATION_STAGES.includes(
    value as ApplicationStage
  );
}

function requireString(
  data: DocumentData,
  key: string,
  code: string
): string {
  const value = data[key];

  if (!isNonEmptyString(value)) {
    throw new ApplicationCommunicationTemplateServiceError(
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
    throw new ApplicationCommunicationTemplateServiceError(
      "다른 조직의 지원자 커뮤니케이션 초안을 조회할 수 없습니다.",
      403,
      "TENANT_ACCESS_DENIED"
    );
  }
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

function formatKoreanDateTime(
  iso: string
): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(date);
}

function methodLabel(
  method: LatestInterviewContext["method"]
): string {
  if (method === "ONSITE") {
    return "대면 면접";
  }

  if (method === "VIDEO") {
    return "화상 면접";
  }

  return "전화 면접";
}

async function getTemplateContext(
  actorUid: string,
  applicationIdInput: string
): Promise<ApplicationTemplateContext> {
  const actor = await requireB2BActor(actorUid);
  const applicationId =
    applicationIdInput.trim();

  if (!applicationId) {
    throw new ApplicationCommunicationTemplateServiceError(
      "지원 ID가 필요합니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("applications")
    .doc(applicationId)
    .get();

  if (!snapshot.exists) {
    throw new ApplicationCommunicationTemplateServiceError(
      "존재하지 않는 지원 내역입니다.",
      404,
      "APPLICATION_NOT_FOUND"
    );
  }

  const data = snapshot.data();

  if (!data) {
    throw new ApplicationCommunicationTemplateServiceError(
      "지원 내역 데이터가 비어 있습니다.",
      409,
      "APPLICATION_DATA_MISSING"
    );
  }

  const organizationId = requireString(
    data,
    "organizationId",
    "APPLICATION_ORGANIZATION_MISSING"
  );

  assertTenantAccess(actor, organizationId);

  if (!isRecord(data.candidateSnapshot)) {
    throw new ApplicationCommunicationTemplateServiceError(
      "지원자 스냅샷을 확인할 수 없습니다.",
      409,
      "CANDIDATE_SNAPSHOT_MISSING"
    );
  }

  if (!isRecord(data.jobSnapshot)) {
    throw new ApplicationCommunicationTemplateServiceError(
      "공고 스냅샷을 확인할 수 없습니다.",
      409,
      "JOB_SNAPSHOT_MISSING"
    );
  }

  if (!isApplicationStage(data.stage)) {
    throw new ApplicationCommunicationTemplateServiceError(
      "지원 단계 데이터가 올바르지 않습니다.",
      409,
      "INVALID_APPLICATION_STAGE"
    );
  }

  return {
    actor,
    applicationId,
    organizationId,
    candidateName:
      isNonEmptyString(data.candidateSnapshot.name)
        ? data.candidateSnapshot.name.trim()
        : "지원자",
    jobTitle:
      isNonEmptyString(data.jobSnapshot.title)
        ? data.jobSnapshot.title.trim()
        : "채용 포지션",
    company:
      isNonEmptyString(data.jobSnapshot.company)
        ? data.jobSnapshot.company.trim()
        : "채용 고객사",
    stage: data.stage,
    hiringOutcome:
      isRecord(data.hiringOutcome)
        ? data.hiringOutcome
        : null,
  };
}

async function getLatestScheduledInterview(
  context: ApplicationTemplateContext
): Promise<LatestInterviewContext | null> {
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("interviews")
    .where(
      "applicationId",
      "==",
      context.applicationId
    )
    .get();

  const candidates = snapshot.docs
    .map((document) => {
      const data = document.data();

      if (
        data.applicationId !== context.applicationId ||
        data.organizationId !== context.organizationId ||
        data.status !== "SCHEDULED" ||
        (
          data.method !== "ONSITE" &&
          data.method !== "VIDEO" &&
          data.method !== "PHONE"
        )
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
        scheduledAt,
        method: data.method,
        location:
          isNonEmptyString(data.location)
            ? data.location.trim()
            : null,
        interviewer:
          isNonEmptyString(data.interviewer)
            ? data.interviewer.trim()
            : null,
      } satisfies LatestInterviewContext;
    })
    .filter(
      (
        item
      ): item is LatestInterviewContext =>
        item !== null
    )
    .sort(
      (a, b) =>
        Date.parse(b.scheduledAt) -
        Date.parse(a.scheduledAt)
    );

  return candidates[0] || null;
}

function buildFirstContactTemplate(
  context: ApplicationTemplateContext
): ApplicationCommunicationTemplateView {
  return {
    key: "FIRST_CONTACT",
    label: "첫 연락",
    subject:
      `[${context.company}] ${context.jobTitle} 채용 관련 연락드립니다`,
    body:
      `${context.candidateName}님, 안녕하세요.\n\n${context.company} ${context.jobTitle} 채용 관련하여 연락드립니다.\n지원 가능 여부와 간단한 통화 가능 시간을 회신해주시면 확인 후 안내드리겠습니다.\n\n감사합니다.`,
    recommended:
      context.stage === "NEW" ||
      context.stage === "REVIEWING",
    reason:
      "초기 접촉 단계의 지원자에게 사용할 수 있는 기본 연락 초안입니다.",
  };
}

function buildFollowUpTemplate(
  context: ApplicationTemplateContext
): ApplicationCommunicationTemplateView {
  return {
    key: "FOLLOW_UP",
    label: "진행 확인",
    subject:
      `[${context.company}] ${context.jobTitle} 채용 진행 관련 안내`,
    body:
      `${context.candidateName}님, 안녕하세요.\n\n${context.company} ${context.jobTitle} 채용 진행 관련하여 연락드립니다.\n추가로 확인이 필요한 사항이 있어 회신 부탁드립니다.\n\n감사합니다.`,
    recommended:
      context.stage === "CONTACTED" ||
      context.stage === "HOLD",
    reason:
      "연락 이후 회신 확인이나 보류 건 재확인이 필요할 때 사용할 수 있습니다.",
  };
}

function buildInterviewTemplate(
  context: ApplicationTemplateContext,
  interview: LatestInterviewContext
): ApplicationCommunicationTemplateView {
  const locationLine = interview.location
    ? `\n장소/접속 정보: ${interview.location}`
    : "";
  const interviewerLine = interview.interviewer
    ? `\n면접관: ${interview.interviewer}`
    : "";

  return {
    key: "INTERVIEW_SCHEDULED",
    label: "면접 일정 안내",
    subject:
      `[${context.company}] ${context.jobTitle} 면접 일정 안내`,
    body:
      `${context.candidateName}님, 안녕하세요.\n\n${context.company} ${context.jobTitle} 면접 일정이 확정되어 안내드립니다.\n\n일시: ${formatKoreanDateTime(interview.scheduledAt)}\n방식: ${methodLabel(interview.method)}${locationLine}${interviewerLine}\n\n일정 변경이 필요한 경우 회신 부탁드립니다.\n감사합니다.`,
    recommended:
      context.stage === "INTERVIEW",
    reason:
      "현재 등록된 가장 최근의 예정 면접 정보를 반영한 초안입니다.",
  };
}

function buildOfferTemplate(
  context: ApplicationTemplateContext
): ApplicationCommunicationTemplateView {
  return {
    key: "OFFER_FOLLOW_UP",
    label: "처우 협의",
    subject:
      `[${context.company}] ${context.jobTitle} 처우 협의 관련 안내`,
    body:
      `${context.candidateName}님, 안녕하세요.\n\n${context.company} ${context.jobTitle} 채용 건의 처우 협의 관련하여 연락드립니다.\n확인이 필요한 사항과 회신 가능 시간을 알려주시면 후속 안내드리겠습니다.\n\n감사합니다.`,
    recommended:
      context.stage === "OFFER",
    reason:
      "OFFER 단계에서 처우 및 입사 조건 협의를 시작할 때 사용할 수 있습니다.",
  };
}

function buildHiredTemplate(
  context: ApplicationTemplateContext
): ApplicationCommunicationTemplateView {
  const plannedStartDate =
    context.hiringOutcome &&
    isNonEmptyString(
      context.hiringOutcome.plannedStartDate
    )
      ? context.hiringOutcome.plannedStartDate.trim()
      : null;
  const startLine = plannedStartDate
    ? `\n현재 등록된 입사 예정일: ${plannedStartDate}`
    : "";

  return {
    key: "HIRED_CONFIRMATION",
    label: "입사 확정 안내",
    subject:
      `[${context.company}] ${context.jobTitle} 최종 합격 및 입사 안내`,
    body:
      `${context.candidateName}님, 안녕하세요.\n\n${context.company} ${context.jobTitle} 채용 전형의 최종 합격을 안내드립니다.${startLine}\n입사 관련 세부 준비사항은 별도로 안내드리겠습니다.\n\n축하드리며, 감사합니다.`,
    recommended:
      context.stage === "HIRED",
    reason:
      "입사 확정 결과와 등록된 입사 예정일을 반영한 후보자 안내 초안입니다.",
  };
}

function buildRejectionTemplate(
  context: ApplicationTemplateContext
): ApplicationCommunicationTemplateView {
  return {
    key: "REJECTION_NOTICE",
    label: "전형 종료 안내",
    subject:
      `[${context.company}] ${context.jobTitle} 채용 전형 결과 안내`,
    body:
      `${context.candidateName}님, 안녕하세요.\n\n${context.company} ${context.jobTitle} 채용 전형에 관심을 갖고 참여해주셔서 감사합니다.\n검토 결과 이번 전형은 여기서 마무리되었음을 안내드립니다.\n귀한 시간 내어 참여해주신 점 감사드리며, 앞으로 좋은 기회가 함께하기를 바랍니다.\n\n감사합니다.`,
    recommended:
      context.stage === "REJECTED",
    reason:
      "내부 불합격 사유를 노출하지 않는 후보자용 전형 종료 안내 초안입니다.",
  };
}

export async function listApplicationCommunicationTemplates(
  actorUid: string,
  applicationIdInput: string
): Promise<ApplicationCommunicationTemplateView[]> {
  const context = await getTemplateContext(
    actorUid,
    applicationIdInput
  );

  const latestInterview =
    context.stage === "INTERVIEW"
      ? await getLatestScheduledInterview(
          context
        )
      : null;

  const templates:
    ApplicationCommunicationTemplateView[] = [
      buildFirstContactTemplate(context),
      buildFollowUpTemplate(context),
    ];

  if (latestInterview) {
    templates.push(
      buildInterviewTemplate(
        context,
        latestInterview
      )
    );
  }

  if (context.stage === "OFFER") {
    templates.push(
      buildOfferTemplate(context)
    );
  }

  if (context.stage === "HIRED") {
    templates.push(
      buildHiredTemplate(context)
    );
  }

  if (context.stage === "REJECTED") {
    templates.push(
      buildRejectionTemplate(context)
    );
  }

  return templates.sort(
    (a, b) =>
      Number(b.recommended) -
      Number(a.recommended)
  );
}
