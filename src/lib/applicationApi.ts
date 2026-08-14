"use client";

import { auth } from "./firebase";
import type {
  ApplicationStage,
  ApplicationView,
} from "../types";

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

export async function fetchB2BApplications(): Promise<
  ApplicationView[]
> {
  return authorizedJsonRequest<ApplicationView[]>(
    "/api/b2b/applications",
    "GET"
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
