"use client";

import { auth } from "./firebase";

export interface AcquisitionAnalyticsView {
  sampleSize: number;
  eventCounts: Array<{ eventName: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  funnel: {
    homeViews: number;
    talentPoolViews: number;
    registerViews: number;
    profileCreated: number;
    talentPoolSettingsSaved: number;
    talentPoolOptedIn: number;
    talentPoolOptedOut: number;
    savedJobsAdded: number;
    opportunitiesCreated: number;
    opportunitiesAccepted: number;
    opportunitiesDeclined: number;
    applicationsSubmitted: number;
  };
}

interface ApiSuccessResponse {
  success: true;
  data: AcquisitionAnalyticsView;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export class AcquisitionAnalyticsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "ACQUISITION_ANALYTICS_API_ERROR"
  ) {
    super(message);
    this.name = "AcquisitionAnalyticsApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchAcquisitionAnalytics(): Promise<AcquisitionAnalyticsView> {
  const user = auth.currentUser;
  if (!user) {
    throw new AcquisitionAnalyticsApiError(
      "관리자 로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/b2b/acquisition", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  let payload: ApiSuccessResponse | ApiErrorResponse | null = null;
  try {
    payload = (await response.json()) as ApiSuccessResponse | ApiErrorResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const errorPayload = payload && payload.success === false ? payload : null;
    throw new AcquisitionAnalyticsApiError(
      errorPayload?.error || "공개 유입 분석을 불러오지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "ACQUISITION_ANALYTICS_REQUEST_FAILED"
    );
  }

  return payload.data;
}
