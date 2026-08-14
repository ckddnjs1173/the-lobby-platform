import {
  Timestamp,
  type DocumentData,
  type Query,
} from "firebase-admin/firestore";

import type {
  ApplicationSource,
  ApplicationStage,
} from "../../types";

import type {
  RecruitingAnalyticsDailyCount,
  RecruitingAnalyticsJobRow,
  RecruitingAnalyticsSourceCount,
  RecruitingAnalyticsStageCount,
  RecruitingAnalyticsSummary,
} from "../analyticsTypes";

import {
  requireB2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class RecruitingAnalyticsServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "RECRUITING_ANALYTICS_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "RecruitingAnalyticsServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface RecruitingAnalyticsOptions {
  days?: number;
  organizationId?: string | null;
}

export const MAX_ANALYTICS_DOCUMENTS = 5_000;
export const MIN_ANALYTICS_DAYS = 7;
export const MAX_ANALYTICS_DAYS = 365;

const STALE_THRESHOLD_MS =
  3 * 24 * 60 * 60 * 1000;

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

const APPLICATION_SOURCES: readonly ApplicationSource[] = [
  "B2C_WEB",
  "B2B_DIRECT",
  "HEADHUNTING",
  "REFERRAL",
];

const ACTIVE_STAGES = new Set<ApplicationStage>([
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "RECOMMEND_PENDING",
  "RECOMMENDED",
  "DOCUMENT_SCREEN",
  "INTERVIEW",
  "OFFER",
]);

const INTERVIEW_OR_LATER_STAGES = new Set<ApplicationStage>([
  "INTERVIEW",
  "OFFER",
  "HIRED",
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

function normalizeDays(
  value: unknown
): number {
  if (value === undefined || value === null) {
    return 30;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new RecruitingAnalyticsServiceError(
      "분석 기간은 정수 일수여야 합니다.",
      400,
      "ANALYTICS_DAYS_INVALID"
    );
  }

  return Math.max(
    MIN_ANALYTICS_DAYS,
    Math.min(MAX_ANALYTICS_DAYS, value)
  );
}

function timestampMillis(
  value: unknown
): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const timestamp = value as {
      toMillis?: () => number;
      toDate?: () => Date;
    };

    try {
      if (typeof timestamp.toMillis === "function") {
        return timestamp.toMillis();
      }

      if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().getTime();
      }
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeStage(
  value: unknown
): ApplicationStage | null {
  return APPLICATION_STAGES.includes(
    value as ApplicationStage
  )
    ? (value as ApplicationStage)
    : null;
}

function normalizeSource(
  value: unknown
): ApplicationSource | null {
  return APPLICATION_SOURCES.includes(
    value as ApplicationSource
  )
    ? (value as ApplicationSource)
    : null;
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

function roundRate(
  numerator: number,
  denominator: number
): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round(
    (numerator / denominator) * 10_000
  ) / 100;
}

function formatDateKey(
  millis: number
): string {
  return new Date(millis)
    .toISOString()
    .slice(0, 10);
}

function resolveOrganizationScope(
  actor: Awaited<ReturnType<typeof requireB2BActor>>,
  requestedOrganizationId: string | null | undefined
): string | null {
  if (actor.role === "RECRUITER") {
    if (!actor.organizationId) {
      throw new RecruitingAnalyticsServiceError(
        "리쿠르터의 조직 정보를 확인할 수 없습니다.",
        403,
        "ANALYTICS_ORGANIZATION_REQUIRED"
      );
    }

    if (
      isNonEmptyString(requestedOrganizationId) &&
      requestedOrganizationId.trim() !== actor.organizationId
    ) {
      throw new RecruitingAnalyticsServiceError(
        "다른 조직의 분석 데이터에는 접근할 수 없습니다.",
        403,
        "ANALYTICS_TENANT_ACCESS_DENIED"
      );
    }

    return actor.organizationId;
  }

  if (!isNonEmptyString(requestedOrganizationId)) {
    return null;
  }

  const normalized = requestedOrganizationId.trim();

  if (normalized.length > 120) {
    throw new RecruitingAnalyticsServiceError(
      "조직 식별자가 너무 깁니다.",
      400,
      "ANALYTICS_ORGANIZATION_INVALID"
    );
  }

  return normalized;
}

function getLastTouchMillis(
  data: DocumentData
): number | null {
  return (
    timestampMillis(data.lastActivityAt) ??
    timestampMillis(data.updatedAt) ??
    timestampMillis(data.appliedAt)
  );
}

export async function getRecruitingAnalytics(
  actorUid: string,
  options: RecruitingAnalyticsOptions = {}
): Promise<RecruitingAnalyticsSummary> {
  const actor = await requireB2BActor(actorUid);
  const days = normalizeDays(options.days);
  const organizationId =
    resolveOrganizationScope(
      actor,
      options.organizationId
    );

  const now = Date.now();
  const windowStartedAtMillis =
    now - days * 24 * 60 * 60 * 1000;
  const db = getFirebaseAdminDb();

  let query: Query<DocumentData> =
    db
      .collection("applications")
      .where(
        "appliedAt",
        ">=",
        Timestamp.fromMillis(windowStartedAtMillis)
      );

  if (organizationId) {
    query = query.where(
      "organizationId",
      "==",
      organizationId
    );
  }

  const snapshot = await query
    .orderBy("appliedAt", "desc")
    .limit(MAX_ANALYTICS_DOCUMENTS + 1)
    .get();

  const truncated =
    snapshot.size > MAX_ANALYTICS_DOCUMENTS;
  const documents = snapshot.docs.slice(
    0,
    MAX_ANALYTICS_DOCUMENTS
  );

  const stageMap = new Map<ApplicationStage, number>(
    APPLICATION_STAGES.map((stage) => [stage, 0])
  );
  const sourceMap = new Map<ApplicationSource, number>(
    APPLICATION_SOURCES.map((source) => [source, 0])
  );
  const dailyMap = new Map<string, number>();
  const jobMap = new Map<
    string,
    RecruitingAnalyticsJobRow
  >();

  let activeApplications = 0;
  let attentionApplications = 0;
  let staleApplications = 0;
  let interviewOrLater = 0;
  let offers = 0;
  let hired = 0;
  let rejected = 0;
  let decisionDurationTotalMs = 0;
  let decisionDurationCount = 0;

  for (const document of documents) {
    const data = document.data();
    const stage = normalizeStage(data.stage);
    const source = normalizeSource(data.source);
    const appliedAt = timestampMillis(data.appliedAt);

    if (stage) {
      stageMap.set(
        stage,
        (stageMap.get(stage) || 0) + 1
      );

      if (ACTIVE_STAGES.has(stage)) {
        activeApplications += 1;

        const lastTouch = getLastTouchMillis(data);
        if (
          lastTouch !== null &&
          now - lastTouch >= STALE_THRESHOLD_MS
        ) {
          staleApplications += 1;
        }
      }

      if (
        stage === "NEW" ||
        stage === "REVIEWING"
      ) {
        attentionApplications += 1;
      }

      if (INTERVIEW_OR_LATER_STAGES.has(stage)) {
        interviewOrLater += 1;
      }

      if (stage === "OFFER") {
        offers += 1;
      }

      if (stage === "HIRED") {
        hired += 1;
      }

      if (stage === "REJECTED") {
        rejected += 1;
      }
    }

    if (source) {
      sourceMap.set(
        source,
        (sourceMap.get(source) || 0) + 1
      );
    }

    if (appliedAt !== null) {
      const dateKey = formatDateKey(appliedAt);
      dailyMap.set(
        dateKey,
        (dailyMap.get(dateKey) || 0) + 1
      );
    }

    const jobId =
      isNonEmptyString(data.jobId)
        ? data.jobId.trim()
        : "unknown";
    const existingJob = jobMap.get(jobId) || {
      jobId,
      jobTitle: nestedString(
        data.jobSnapshot,
        "title",
        "공고명 없음"
      ),
      company: nestedString(
        data.jobSnapshot,
        "company",
        "기업명 없음"
      ),
      applications: 0,
      hired: 0,
      active: 0,
    };

    existingJob.applications += 1;
    if (stage === "HIRED") {
      existingJob.hired += 1;
    }
    if (stage && ACTIVE_STAGES.has(stage)) {
      existingJob.active += 1;
    }
    jobMap.set(jobId, existingJob);

    if (
      appliedAt !== null &&
      isRecord(data.hiringOutcome)
    ) {
      const decidedAt =
        timestampMillis(data.hiringOutcome.decidedAt);

      if (
        decidedAt !== null &&
        decidedAt >= appliedAt
      ) {
        decisionDurationTotalMs +=
          decidedAt - appliedAt;
        decisionDurationCount += 1;
      }
    }
  }

  const stageCounts: RecruitingAnalyticsStageCount[] =
    APPLICATION_STAGES.map((stage) => ({
      stage,
      count: stageMap.get(stage) || 0,
    }));

  const sourceCounts: RecruitingAnalyticsSourceCount[] =
    APPLICATION_SOURCES.map((source) => ({
      source,
      count: sourceMap.get(source) || 0,
    }));

  const dailyApplications: RecruitingAnalyticsDailyCount[] =
    Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

  const topJobs = Array.from(jobMap.values())
    .sort((a, b) => {
      if (b.applications !== a.applications) {
        return b.applications - a.applications;
      }

      return a.jobTitle.localeCompare(
        b.jobTitle,
        "ko"
      );
    })
    .slice(0, 10);

  const totalApplications = documents.length;
  const averageDecisionDays =
    decisionDurationCount > 0
      ? Math.round(
          (decisionDurationTotalMs /
            decisionDurationCount /
            (24 * 60 * 60 * 1000)) *
            10
        ) / 10
      : null;

  return {
    windowDays: days,
    windowStartedAt:
      new Date(windowStartedAtMillis).toISOString(),
    generatedAt: new Date(now).toISOString(),
    organizationId,
    truncated,
    processedApplications: documents.length,
    totalApplications,
    activeApplications,
    attentionApplications,
    staleApplications,
    interviewOrLater,
    offers,
    hired,
    rejected,
    hireRate: roundRate(hired, totalApplications),
    interviewOrLaterRate:
      roundRate(interviewOrLater, totalApplications),
    averageDecisionDays,
    stageCounts,
    sourceCounts,
    dailyApplications,
    topJobs,
  };
}
