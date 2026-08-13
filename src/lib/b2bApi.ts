"use client";

import {
  auth,
} from "./firebase";

// ============================================================================
// B2B Session
// ============================================================================

export type B2BRole =
  | "ADMIN"
  | "RECRUITER";

export interface B2BSession {
  uid: string;

  name: string;

  email: string;

  role: B2BRole;

  organizationId:
    | string
    | null;

  status: "ACTIVE";
}

// ============================================================================
// Candidate Profile View
// ============================================================================

export interface B2BCandidateProfile {
  candidateId: string;

  headline: string;

  careerSummary: string;

  skills: string[];

  careers: Record<
    string,
    unknown
  >[];

  education: Record<
    string,
    unknown
  >[];

  certifications: Record<
    string,
    unknown
  >[];

  languages: Record<
    string,
    unknown
  >[];

  desiredJob:
    | string
    | null;

  desiredLocation:
    | string
    | null;

  desiredSalary:
    | string
    | null;

  profileCompleteness: number;

  updatedAt:
    | string
    | null;
}

// ============================================================================
// API Shapes
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

// ============================================================================
// Error
// ============================================================================

export class B2BApiError extends Error {
  readonly status: number;

  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "B2B_API_ERROR"
  ) {
    super(message);

    this.name =
      "B2BApiError";

    this.status =
      status;

    this.code =
      code;
  }
}

// ============================================================================
// Authentication
// ============================================================================

async function getFirebaseIdToken(): Promise<string> {
  const user =
    auth.currentUser;

  if (!user) {
    throw new B2BApiError(
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

    throw new B2BApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

// ============================================================================
// Authorized Request
// ============================================================================

async function authorizedGet<T>(
  url: string
): Promise<T> {
  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },

          cache:
            "no-store",
        }
      );
  } catch (error) {
    console.error(
      "B2B API network error:",
      error
    );

    throw new B2BApiError(
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
      "B2B API response parse error:",
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

    throw new B2BApiError(
      errorPayload?.error ||
        "요청을 처리할 수 없습니다.",

      response.status || 500,

      errorPayload?.code ||
        "B2B_API_REQUEST_FAILED"
    );
  }

  return payload.data;
}

// ============================================================================
// Session API
// ============================================================================

export async function fetchB2BSession(): Promise<B2BSession> {
  return authorizedGet<B2BSession>(
    "/api/b2b/session"
  );
}

// ============================================================================
// Candidate Profile API
// ============================================================================

export async function fetchB2BCandidateProfile(
  applicationId: string
): Promise<B2BCandidateProfile | null> {
  const normalizedApplicationId =
    applicationId.trim();

  if (
    !normalizedApplicationId
  ) {
    throw new B2BApiError(
      "지원 ID가 없습니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  return authorizedGet<
    B2BCandidateProfile | null
  >(
    `/api/b2b/applications/${encodeURIComponent(
      normalizedApplicationId
    )}/candidate-profile`
  );
}