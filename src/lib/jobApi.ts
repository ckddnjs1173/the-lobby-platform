"use client";

import {
  auth,
} from "./firebase";

import type {
  JobStatus,
} from "../types";

export interface B2BJobView {
  jobId: string;
  organizationId: string;
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  status: JobStatus;
  recruiterId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateB2BJobInput {
  organizationId?: string;
  company: string;
  displayCompany?: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  status: Extract<JobStatus, "OPEN" | "DRAFT">;
}

export type UpdateB2BJobInput = Partial<
  Omit<
    CreateB2BJobInput,
    "organizationId"
  >
> & {
  status?: JobStatus;
};

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

export class JobApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "JOB_API_ERROR"
  ) {
    super(message);
    this.name = "JobApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new JobApiError(
      "관리자 로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error(
      "Failed to get Firebase ID token:",
      error
    );

    throw new JobApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function authorizedRequest<T>(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
): Promise<T> {
  const idToken = await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
        Authorization: `Bearer ${idToken}`,
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
      "Job API network error:",
      error
    );

    throw new JobApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<T>;
  } catch (error) {
    console.error(
      "Job API response parse error:",
      error
    );
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

    throw new JobApiError(
      errorPayload?.error ||
        "공고 요청을 처리할 수 없습니다.",
      response.status || 500,
      errorPayload?.code || "JOB_API_ERROR"
    );
  }

  return payload.data;
}

export async function fetchB2BJobs(): Promise<B2BJobView[]> {
  return authorizedRequest<B2BJobView[]>(
    "/api/b2b/jobs",
    "GET"
  );
}

export async function createB2BJobViaApi(
  input: CreateB2BJobInput
): Promise<B2BJobView> {
  return authorizedRequest<B2BJobView>(
    "/api/b2b/jobs",
    "POST",
    input as unknown as Record<string, unknown>
  );
}

export async function updateB2BJobViaApi(
  jobId: string,
  input: UpdateB2BJobInput
): Promise<B2BJobView> {
  const normalizedJobId = jobId.trim();

  if (!normalizedJobId) {
    throw new JobApiError(
      "공고 ID가 없습니다.",
      400,
      "JOB_ID_REQUIRED"
    );
  }

  return authorizedRequest<B2BJobView>(
    `/api/b2b/jobs/${encodeURIComponent(normalizedJobId)}`,
    "PATCH",
    input as unknown as Record<string, unknown>
  );
}
