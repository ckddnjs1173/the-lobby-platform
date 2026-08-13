"use client";

import {
  auth,
} from "./firebase";

export interface CandidatePoolItem {
  candidateId: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  source: "B2B_DIRECT";
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdBy: string;
  headline: string;
  skills: string[];
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
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

type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export class CandidatePoolApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "CANDIDATE_POOL_API_ERROR"
  ) {
    super(message);
    this.name = "CandidatePoolApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new CandidatePoolApiError(
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

    throw new CandidatePoolApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

export async function fetchCandidatePool(
  organizationId?: string | null
): Promise<CandidatePoolItem[]> {
  const idToken =
    await getFirebaseIdToken();

  const params =
    new URLSearchParams();

  if (organizationId?.trim()) {
    params.set(
      "organizationId",
      organizationId.trim()
    );
  }

  const url =
    params.size > 0
      ? `/api/b2b/candidates?${params.toString()}`
      : "/api/b2b/candidates";

  let response: Response;

  try {
    response = await fetch(
      url,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${idToken}`,
        },
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Candidate pool network error:",
      error
    );

    throw new CandidatePoolApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload:
    | ApiResponse<CandidatePoolItem[]>
    | null = null;

  try {
    payload =
      (await response.json()) as
        ApiResponse<CandidatePoolItem[]>;
  } catch (error) {
    console.error(
      "Candidate pool response parse error:",
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

    throw new CandidatePoolApiError(
      errorPayload?.error ||
        "후보자 풀을 불러오지 못했습니다.",
      response.status || 500,
      errorPayload?.code ||
        "CANDIDATE_POOL_API_ERROR"
    );
  }

  return payload.data;
}
