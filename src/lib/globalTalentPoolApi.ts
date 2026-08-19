"use client";

import { auth } from "./firebase";
import type { JobSearchStatus } from "./candidatePreferenceTypes";

export interface GlobalTalentPoolItem {
  candidateId: string;
  name: string;
  phone: string;
  email: string;
  headline: string;
  skills: string[];
  desiredJob: string;
  desiredLocation: string;
  desiredSalary: string;
  desiredEmploymentType: string;
  jobSearchStatus: JobSearchStatus;
  availableFrom: string;
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GlobalTalentPoolPagination {
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GlobalTalentPoolPage {
  items: GlobalTalentPoolItem[];
  pagination: GlobalTalentPoolPagination;
}

interface ApiSuccessResponse {
  success: true;
  data: GlobalTalentPoolItem[];
  pagination: GlobalTalentPoolPagination;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export class GlobalTalentPoolApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "GLOBAL_TALENT_POOL_API_ERROR"
  ) {
    super(message);
    this.name = "GlobalTalentPoolApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchGlobalTalentPool(options: {
  cursor?: string | null;
  query?: string | null;
  limit?: number;
} = {}): Promise<GlobalTalentPoolPage> {
  const user = auth.currentUser;
  if (!user) {
    throw new GlobalTalentPoolApiError(
      "관리자 로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const token = await user.getIdToken();
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.query) params.set("query", options.query);
  if (options.limit) params.set("limit", String(options.limit));

  const response = await fetch(
    `/api/b2b/talent-pool${params.size ? `?${params.toString()}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  let payload: ApiSuccessResponse | ApiErrorResponse | null = null;
  try {
    payload = (await response.json()) as ApiSuccessResponse | ApiErrorResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const errorPayload = payload && payload.success === false ? payload : null;
    throw new GlobalTalentPoolApiError(
      errorPayload?.error || "J&C 공개 인재풀을 불러오지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "GLOBAL_TALENT_POOL_REQUEST_FAILED"
    );
  }

  return {
    items: payload.data,
    pagination: payload.pagination,
  };
}
