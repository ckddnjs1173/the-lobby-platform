"use client";

import { auth } from "./firebase";
import type {
  ApplicationStage,
} from "../types";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Error
// ============================================================================

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

// ============================================================================
// Authentication
// ============================================================================

/**
 * 현재 로그인한 Firebase 사용자의 ID Token을 가져온다.
 *
 * Firebase Auth UID 자체를 Backend 인증값으로 보내지 않는다.
 * 실제 Firebase ID Token을 Authorization Bearer Token으로 전송하고,
 * 서버에서 Firebase Admin SDK의 verifyIdToken()으로 검증한다.
 */
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

// ============================================================================
// HTTP Core
// ============================================================================

async function authorizedJsonRequest<T>(
  url: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<T> {
  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(url, {
      method,

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${idToken}`,
      },

      body: JSON.stringify(body),

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

  /**
   * HTTP Error이거나 API success:false인 경우.
   */
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

// ============================================================================
// B2C Apply API
// ============================================================================

/**
 * B2C 원클릭 지원.
 *
 * 클라이언트가 서버에 전달하는 것은 jobId뿐이다.
 *
 * 다음 값은 서버가 인증/DB를 통해 직접 결정한다.
 *
 * - authUid
 * - candidateId
 * - organizationId
 * - recruiterId
 * - source
 * - changedBy
 * - timestamps
 */
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

// ============================================================================
// B2B Stage API
// ============================================================================

/**
 * Recruiter Application Stage 변경.
 *
 * changedBy UID는 절대 클라이언트에서 보내지 않는다.
 * 서버에서 Firebase ID Token으로 실제 변경자를 결정한다.
 */
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