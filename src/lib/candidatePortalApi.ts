"use client";

import {
  auth,
} from "./firebase";

import type {
  CandidatePortalApplicationView,
  CandidatePortalBootstrapResult,
  CandidatePortalProfileView,
} from "./candidatePortalTypes";

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

export class CandidatePortalApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "CANDIDATE_PORTAL_API_ERROR"
  ) {
    super(message);
    this.name = "CandidatePortalApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new CandidatePortalApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error(
      "Candidate portal token lookup failed:",
      error
    );

    throw new CandidatePortalApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function authorizedRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const token =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(
      url,
      {
        ...init,
        headers: {
          Authorization:
            `Bearer ${token}`,
          ...(init?.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
          ...(init?.headers || {}),
        },
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Candidate portal network request failed:",
      error
    );

    throw new CandidatePortalApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload:
    ApiResponse<T> | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
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

    throw new CandidatePortalApiError(
      errorPayload?.error ||
        "Candidate Portal 요청을 처리하지 못했습니다.",
      response.status || 500,
      errorPayload?.code ||
        "CANDIDATE_PORTAL_REQUEST_FAILED"
    );
  }

  return payload.data;
}

export interface CandidatePortalProfileInput {
  name: string;
  phone: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CandidatePortalProfileView["careers"];
  education: CandidatePortalProfileView["education"];
}

export async function bootstrapCandidateProfileViaApi(
  input: CandidatePortalProfileInput
): Promise<CandidatePortalBootstrapResult> {
  return authorizedRequest<
    CandidatePortalBootstrapResult
  >(
    "/api/candidate/me",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function fetchCandidatePortalProfile(): Promise<
  CandidatePortalProfileView
> {
  return authorizedRequest<
    CandidatePortalProfileView
  >(
    "/api/candidate/me",
    {
      method: "GET",
    }
  );
}

export async function updateCandidatePortalProfileViaApi(
  input: CandidatePortalProfileInput
): Promise<CandidatePortalProfileView> {
  return authorizedRequest<
    CandidatePortalProfileView
  >(
    "/api/candidate/me",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function fetchCandidatePortalApplications(): Promise<
  CandidatePortalApplicationView[]
> {
  return authorizedRequest<
    CandidatePortalApplicationView[]
  >(
    "/api/candidate/applications",
    {
      method: "GET",
    }
  );
}
