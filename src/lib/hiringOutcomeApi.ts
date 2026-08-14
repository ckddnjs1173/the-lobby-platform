"use client";

import {
  auth,
} from "./firebase";

import type {
  HiringOutcomeStatus,
  HiringOutcomeView,
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

export class HiringOutcomeApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "HIRING_OUTCOME_API_ERROR"
  ) {
    super(message);
    this.name = "HiringOutcomeApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new HiringOutcomeApiError(
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

    throw new HiringOutcomeApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

export async function recordHiringOutcomeViaApi(
  applicationId: string,
  input: {
    status: HiringOutcomeStatus;
    note?: string;
    plannedStartDate?: string;
  }
): Promise<HiringOutcomeView> {
  const normalizedApplicationId =
    applicationId.trim();

  if (!normalizedApplicationId) {
    throw new HiringOutcomeApiError(
      "지원 ID가 없습니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(
      `/api/b2b/applications/${encodeURIComponent(
        normalizedApplicationId
      )}/outcome`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          status:
            input.status,
          note:
            input.note?.trim() || "",
          plannedStartDate:
            input.plannedStartDate || "",
        }),
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Hiring outcome API network error:",
      error
    );

    throw new HiringOutcomeApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload:
    | ApiResponse<HiringOutcomeView>
    | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<HiringOutcomeView>;
  } catch (error) {
    console.error(
      "Hiring outcome API response parse error:",
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

    throw new HiringOutcomeApiError(
      errorPayload?.error ||
        "최종 채용 결과를 처리할 수 없습니다.",
      response.status || 500,
      errorPayload?.code ||
        "HIRING_OUTCOME_API_ERROR"
    );
  }

  return payload.data;
}
