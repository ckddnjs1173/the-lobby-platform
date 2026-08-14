"use client";

import {
  auth,
} from "./firebase";

import type {
  B2BApplicationPage,
} from "./applicationPageTypes";

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

export class ApplicationPageApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "APPLICATION_PAGE_API_ERROR"
  ) {
    super(message);
    this.name = "ApplicationPageApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchB2BApplicationPage(
  options: {
    pageSize?: number;
    cursor?: string | null;
  } = {}
): Promise<B2BApplicationPage> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApplicationPageApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const idToken = await user.getIdToken();
  const params = new URLSearchParams();

  if (options.pageSize) {
    params.set(
      "limit",
      String(options.pageSize)
    );
  }

  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  const response = await fetch(
    `/api/b2b/applications/page?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
    }
  );

  let payload: ApiResponse<B2BApplicationPage> | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<B2BApplicationPage>;
  } catch {
    payload = null;
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

    throw new ApplicationPageApiError(
      errorPayload?.error ||
        "지원 목록 페이지를 불러오지 못했습니다.",
      response.status || 500,
      errorPayload?.code ||
        "APPLICATION_PAGE_API_ERROR"
    );
  }

  return payload.data;
}
