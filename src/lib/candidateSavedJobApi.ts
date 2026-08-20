"use client";

import { auth } from "./firebase";

export interface CandidateSavedJobView {
  jobId: string;
  savedAt: string | null;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class CandidateSavedJobApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "CANDIDATE_SAVED_JOB_API_ERROR"
  ) {
    super(message);
    this.name = "CandidateSavedJobApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new CandidateSavedJobApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const token = await user.getIdToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const errorPayload = payload && payload.success === false ? payload : null;
    throw new CandidateSavedJobApiError(
      errorPayload?.error || "저장공고 요청을 처리하지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "CANDIDATE_SAVED_JOB_REQUEST_FAILED"
    );
  }

  return payload.data;
}

export async function fetchCandidateSavedJobs(): Promise<CandidateSavedJobView[]> {
  return request<CandidateSavedJobView[]>("/api/candidate/saved-jobs");
}

export async function saveCandidateJobViaApi(
  jobId: string
): Promise<CandidateSavedJobView> {
  return request<CandidateSavedJobView>("/api/candidate/saved-jobs", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  });
}

export async function removeCandidateSavedJobViaApi(
  jobId: string
): Promise<{ jobId: string; removed: true }> {
  return request<{ jobId: string; removed: true }>(
    `/api/candidate/saved-jobs/${encodeURIComponent(jobId)}`,
    { method: "DELETE" }
  );
}
