import type {
  DocumentData,
  Query,
} from "firebase-admin/firestore";

import type {
  ApplicationSource,
  ApplicationStage,
  ApplicationView,
  HiringOutcomeView,
} from "../../types";

import type {
  B2BApplicationPage,
} from "../applicationPageTypes";

import {
  requireB2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class ApplicationPageServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "APPLICATION_PAGE_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "ApplicationPageServiceError";
    this.status = status;
    this.code = code;
  }
}

export const DEFAULT_APPLICATION_PAGE_SIZE = 50;
export const MAX_APPLICATION_PAGE_SIZE = 100;

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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizePageSize(
  value: unknown
): number {
  if (value === undefined || value === null) {
    return DEFAULT_APPLICATION_PAGE_SIZE;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new ApplicationPageServiceError(
      "페이지 크기 형식이 올바르지 않습니다.",
      400,
      "APPLICATION_PAGE_SIZE_INVALID"
    );
  }

  return Math.max(
    1,
    Math.min(MAX_APPLICATION_PAGE_SIZE, value)
  );
}

function encodeCursor(
  documentId: string
): string {
  return Buffer
    .from(documentId, "utf8")
    .toString("base64url");
}

function decodeCursor(
  cursor: unknown
): string | null {
  if (cursor === undefined || cursor === null || cursor === "") {
    return null;
  }

  if (
    typeof cursor !== "string" ||
    cursor.length > 512
  ) {
    throw new ApplicationPageServiceError(
      "페이지 커서 형식이 올바르지 않습니다.",
      400,
      "APPLICATION_CURSOR_INVALID"
    );
  }

  try {
    const decoded = Buffer
      .from(cursor, "base64url")
      .toString("utf8")
      .trim();

    if (!decoded || decoded.length > 256) {
      throw new Error("invalid cursor");
    }

    return decoded;
  } catch {
    throw new ApplicationPageServiceError(
      "페이지 커서 형식이 올바르지 않습니다.",
      400,
      "APPLICATION_CURSOR_INVALID"
    );
  }
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
    const timestamp = value as {
      toDate?: () => Date;
    };

    if (typeof timestamp.toDate === "function") {
      try {
        return timestamp.toDate().toISOString();
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
  if (!isRecord(value)) {
    return fallback;
  }

  const nested = value[key];

  return isNonEmptyString(nested)
    ? nested.trim()
    : fallback;
}

function normalizeHiringOutcome(
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
    timestampToIsoString(value.decidedAt);

  if (!decidedAt) {
    return null;
  }

  return {
    status: value.status,
    decidedAt,
    decidedBy: value.decidedBy.trim(),
    note:
      typeof value.note === "string"
        ? value.note.trim()
        : "",
    plannedStartDate:
      typeof value.plannedStartDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.plannedStartDate)
        ? value.plannedStartDate
        : null,
  };
}

function toApplicationView(
  documentId: string,
  data: DocumentData
): ApplicationView {
  const stage = data.stage as ApplicationStage;
  const source = data.source as ApplicationSource;

  if (!APPLICATION_STAGES.has(stage)) {
    throw new ApplicationPageServiceError(
      `지원 내역 ${documentId}의 단계 정보가 올바르지 않습니다.`,
      409,
      "APPLICATION_STAGE_INVALID"
    );
  }

  if (!APPLICATION_SOURCES.has(source)) {
    throw new ApplicationPageServiceError(
      `지원 내역 ${documentId}의 유입 경로 정보가 올바르지 않습니다.`,
      409,
      "APPLICATION_SOURCE_INVALID"
    );
  }

  const required = (
    key: string
  ): string => {
    const value = data[key];

    if (!isNonEmptyString(value)) {
      throw new ApplicationPageServiceError(
        `지원 내역 ${documentId}의 ${key} 정보가 누락되어 있습니다.`,
        409,
        "APPLICATION_LIST_DATA_INVALID"
      );
    }

    return value.trim();
  };

  return {
    applicationId:
      isNonEmptyString(data.applicationId)
        ? data.applicationId.trim()
        : documentId,
    candidateId: required("candidateId"),
    jobId: required("jobId"),
    organizationId: required("organizationId"),
    recruiterId: required("recruiterId"),
    stage,
    source,
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
    hiringOutcome:
      normalizeHiringOutcome(data.hiringOutcome),
    appliedAt: timestampToIsoString(data.appliedAt),
    updatedAt: timestampToIsoString(data.updatedAt),
    lastActivityAt:
      timestampToIsoString(data.lastActivityAt),
  };
}

export async function listB2BApplicationPage(
  actorUid: string,
  options: {
    pageSize?: number;
    cursor?: string | null;
  } = {}
): Promise<B2BApplicationPage> {
  const actor = await requireB2BActor(actorUid);
  const pageSize = normalizePageSize(options.pageSize);
  const cursorDocumentId = decodeCursor(options.cursor);
  const db = getFirebaseAdminDb();
  const applications = db.collection("applications");

  let query: Query<DocumentData> = applications;

  if (actor.role === "RECRUITER") {
    query = query.where(
      "organizationId",
      "==",
      actor.organizationId
    );
  }

  query = query.orderBy("appliedAt", "desc");

  if (cursorDocumentId) {
    const cursorSnapshot =
      await applications.doc(cursorDocumentId).get();

    if (!cursorSnapshot.exists) {
      throw new ApplicationPageServiceError(
        "페이지 커서가 더 이상 유효하지 않습니다.",
        400,
        "APPLICATION_CURSOR_NOT_FOUND"
      );
    }

    const cursorData = cursorSnapshot.data();

    if (
      actor.role === "RECRUITER" &&
      cursorData?.organizationId !== actor.organizationId
    ) {
      throw new ApplicationPageServiceError(
        "다른 조직의 페이지 커서를 사용할 수 없습니다.",
        403,
        "APPLICATION_CURSOR_TENANT_DENIED"
      );
    }

    if (!cursorData?.appliedAt) {
      throw new ApplicationPageServiceError(
        "페이지 커서의 정렬 정보가 없습니다.",
        400,
        "APPLICATION_CURSOR_SORT_MISSING"
      );
    }

    query = query.startAfter(cursorSnapshot);
  }

  const snapshot = await query
    .limit(pageSize + 1)
    .get();
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocuments = snapshot.docs.slice(
    0,
    pageSize
  );
  const lastDocument =
    pageDocuments.length > 0
      ? pageDocuments[pageDocuments.length - 1]
      : null;

  return {
    items: pageDocuments.map((document) =>
      toApplicationView(
        document.id,
        document.data()
      )
    ),
    nextCursor:
      hasMore && lastDocument
        ? encodeCursor(lastDocument.id)
        : null,
    hasMore,
    pageSize,
  };
}
