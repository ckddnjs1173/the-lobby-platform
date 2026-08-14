"use client";

import { auth } from "./firebase";
import type {
  ApplicationStage,
  ApplicationView,
} from "../types";
import type {
  B2BApplicationPage,
} from "./applicationPageTypes";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export interface ApplyToJobResult {
  applicationId: string;
  stage: ApplicationStage;
}

export interface UpdateApplicationStageResult {
  applicationId: string;
  stage: ApplicationStage;
  changed: boolean;
}

export class ApplicationApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "APPLICATION_API_ERROR"
  ) {
    super(message);
    this.name = "ApplicationApiError";
    this.status = status;
    this.code = code;
  }
}

const WORKSPACE_APPLICATION_PAGE_SIZE = 100;
const MAX_WORKSPACE_APPLICATIONS = 500;

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApplicationApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error(
      "Failed to get Firebase ID Token:",
      error
    );

    throw new ApplicationApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function authorizedJsonRequest<T>(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
): Promise<T> {
  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        Authorization:
          `Bearer ${idToken}`,
      },
      ...(body
        ? {
            body: JSON.stringify(body),
          }
        : {}),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "Application API network error:",
      error
    );

    throw new ApplicationApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload:
    | ApiResponse<T>
    | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<T>;
  } catch (error) {
    console.error(
      "Application API response parse error:",
      error
    );
  }

  if (
    !response.ok ||
    !payload ||
    payload.success !== true
  ) {
    const errorPayload =
      payload &&
      payload.success === false
        ? payload
        : null;

    throw new ApplicationApiError(
      errorPayload?.error ||
        "요청 처리 중 오류가 발생했습니다.",
      response.status || 500,
      errorPayload?.code ||
        "APPLICATION_API_ERROR"
    );
  }

  return payload.data;
}

/**
 * B2B workspace는 더 이상 `/api/b2b/applications` 전체 조회를 사용하지 않는다.
 *
 * 화면 계약(ApplicationView[])은 유지하되 서버 cursor page를 순차 조회하고
 * 한 번의 refresh에서 최대 500건으로 hard cap을 둔다. 전체 KPI/퍼널은
 * `/api/b2b/analytics`에서 별도로 계산한다.
 */
export async function fetchB2BApplications(): Promise<
  ApplicationView[]
> {
  const applications: ApplicationView[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (
    hasMore &&
    applications.length < MAX_WORKSPACE_APPLICATIONS
  ) {
    const params = new URLSearchParams();
    params.set(
      "limit",
      String(WORKSPACE_APPLICATION_PAGE_SIZE)
    );

    if (cursor) {
      params.set("cursor", cursor);
    }

    const page =
      await authorizedJsonRequest<B2BApplicationPage>(
        `/api/b2b/applications/page?${params.toString()}`,
        "GET"
      );

    applications.push(...page.items);
    cursor = page.nextCursor;
    hasMore = page.hasMore && Boolean(cursor);
  }

  if (
    hasMore &&
    applications.length >= MAX_WORKSPACE_APPLICATIONS
  ) {
    console.warn(
      `B2B workspace application load capped at ${MAX_WORKSPACE_APPLICATIONS}. Use recruiting analytics for full-period KPIs.`
    );
  }

  return applications.slice(
    0,
    MAX_WORKSPACE_APPLICATIONS
  );
}

export async function applyToJob(
  jobId: string
): Promise<ApplyToJobResult> {
  if (!jobId.trim()) {
    throw new ApplicationApiError(
      "지원할 공고 정보가 없습니다.",
      400,
      "JOB_ID_REQUIRED"
    );
  }

  return authorizedJsonRequest<ApplyToJobResult>(
    "/api/applications/apply",
    "POST",
    {
      jobId: jobId.trim(),
    }
  );
}

export async function updateApplicationStageViaApi(
  applicationId: string,
  stage: ApplicationStage,
  note?: string
): Promise<UpdateApplicationStageResult> {
  if (!applicationId.trim()) {
    throw new ApplicationApiError(
      "지원 ID가 없습니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  const body: Record<string, unknown> = {
    stage,
  };

  if (note?.trim()) {
    body.note = note.trim();
  }

  return authorizedJsonRequest<UpdateApplicationStageResult>(
    `/api/applications/${encodeURIComponent(
      applicationId
    )}/stage`,
    "PATCH",
    body
  );
}
