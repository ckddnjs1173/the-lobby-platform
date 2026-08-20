"use client";

import { auth } from "./firebase";
import type {
  CandidatePreferencesInput,
  CandidatePreferencesView,
} from "./candidatePreferenceTypes";

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

export class CandidatePreferenceApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "CANDIDATE_PREFERENCE_API_ERROR"
  ) {
    super(message);
    this.name = "CandidatePreferenceApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  method: "GET" | "PATCH",
  body?: CandidatePreferencesInput
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new CandidatePreferenceApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/candidate/preferences", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
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
    throw new CandidatePreferenceApiError(
      errorPayload?.error || "인재풀 설정 요청을 처리하지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "CANDIDATE_PREFERENCE_REQUEST_FAILED"
    );
  }

  return payload.data;
}

export async function fetchCandidatePreferences(): Promise<CandidatePreferencesView> {
  return request<CandidatePreferencesView>("GET");
}

export async function updateCandidatePreferencesViaApi(
  input: CandidatePreferencesInput
): Promise<CandidatePreferencesView> {
  return request<CandidatePreferencesView>("PATCH", input);
}
