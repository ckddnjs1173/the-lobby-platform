"use client";

import {
  auth,
} from "./firebase";

import type {
  ApplicationStage,
  EventType,
} from "../types";

export interface ApplicationActivityItem {
  eventId: string;
  applicationId: string;
  organizationId: string;
  type: EventType;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage | null;
  changedBy: string;
  note: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
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

export class ApplicationActivityApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "APPLICATION_ACTIVITY_API_ERROR"
  ) {
    super(message);
    this.name = "ApplicationActivityApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApplicationActivityApiError(
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

    throw new ApplicationActivityApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function authorizedRequest<T>(
  url: string,
  method: "GET" | "POST",
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
      "Application activity API network error:",
      error
    );

    throw new ApplicationActivityApiError(
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
      "Application activity API response parse error:",
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

    throw new ApplicationActivityApiError(
      errorPayload?.error ||
        "지원 활동 요청을 처리할 수 없습니다.",
      response.status || 500,
      errorPayload?.code ||
        "APPLICATION_ACTIVITY_API_ERROR"
    );
  }

  return payload.data;
}

export async function fetchApplicationActivity(
  applicationId: string
): Promise<ApplicationActivityItem[]> {
  const normalizedApplicationId = applicationId.trim();

  if (!normalizedApplicationId) {
    throw new ApplicationActivityApiError(
      "지원 ID가 없습니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  return authorizedRequest<ApplicationActivityItem[]>(
    `/api/b2b/applications/${encodeURIComponent(
      normalizedApplicationId
    )}/activity`,
    "GET"
  );
}

export async function addApplicationNoteViaApi(
  applicationId: string,
  note: string
): Promise<ApplicationActivityItem> {
  const normalizedApplicationId = applicationId.trim();
  const normalizedNote = note.trim();

  if (!normalizedApplicationId) {
    throw new ApplicationActivityApiError(
      "지원 ID가 없습니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  if (!normalizedNote) {
    throw new ApplicationActivityApiError(
      "메모 내용을 입력해주세요.",
      400,
      "NOTE_REQUIRED"
    );
  }

  if (normalizedNote.length > 2000) {
    throw new ApplicationActivityApiError(
      "메모는 2,000자를 초과할 수 없습니다.",
      400,
      "NOTE_TOO_LONG"
    );
  }

  return authorizedRequest<ApplicationActivityItem>(
    `/api/b2b/applications/${encodeURIComponent(
      normalizedApplicationId
    )}/activity`,
    "POST",
    {
      note: normalizedNote,
    }
  );
}
