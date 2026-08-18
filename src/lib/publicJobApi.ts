"use client";

import type { PublicJobView } from "./publicJobTypes";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: string;
  code?: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class PublicJobApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 500, code = "PUBLIC_JOB_API_ERROR") {
    super(message);
    this.name = "PublicJobApiError";
    this.status = status;
    this.code = code;
  }
}

async function requestPublicJobs<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Public job network request failed:", error);
    throw new PublicJobApiError(
      "채용 공고 서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const failure = payload && payload.success === false ? payload : null;
    throw new PublicJobApiError(
      failure?.error || "채용 공고를 불러오지 못했습니다.",
      response.status || 500,
      failure?.code || "PUBLIC_JOB_REQUEST_FAILED"
    );
  }

  return payload.data;
}

export function fetchPublicJobs(): Promise<PublicJobView[]> {
  return requestPublicJobs<PublicJobView[]>("/api/public/jobs");
}

export function fetchPublicJob(jobId: string): Promise<PublicJobView> {
  return requestPublicJobs<PublicJobView>(
    `/api/public/jobs/${encodeURIComponent(jobId)}`
  );
}
