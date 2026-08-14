"use client";

import {
  auth,
} from "./firebase";

import type {
  RecruitingAnalyticsSummary,
} from "./analyticsTypes";

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

export class AnalyticsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "ANALYTICS_API_ERROR"
  ) {
    super(message);
    this.name = "AnalyticsApiError";
    this.status = status;
    this.code = code;
  }
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new AnalyticsApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  return user.getIdToken();
}

export async function fetchRecruitingAnalytics(
  days: number,
  organizationId?: string | null
): Promise<RecruitingAnalyticsSummary> {
  const idToken = await getIdToken();
  const params = new URLSearchParams();
  params.set("days", String(days));

  if (organizationId?.trim()) {
    params.set(
      "organizationId",
      organizationId.trim()
    );
  }

  const response = await fetch(
    `/api/b2b/analytics?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    }
  );

  let payload: ApiResponse<RecruitingAnalyticsSummary> | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<RecruitingAnalyticsSummary>;
  } catch {
    payload = null;
  }

  if (
    !response.ok ||
    !payload ||
    payload.success !== true
  ) {
    const errorPayload =
      payload && payload.success === false
        ? payload
        : null;

    throw new AnalyticsApiError(
      errorPayload?.error ||
        "채용 분석 데이터를 불러오지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "ANALYTICS_API_ERROR"
    );
  }

  return payload.data;
}
