"use client";

import {
  auth,
} from "./firebase";

export type ApplicationCommunicationStatus =
  | "PENDING"
  | "SENT"
  | "FAILED";

export interface ApplicationCommunicationView {
  communicationId: string;
  applicationId: string;
  organizationId: string;
  candidateId: string;
  channel: "EMAIL";
  status: ApplicationCommunicationStatus;
  to: string;
  subject: string;
  body: string;
  provider: string | null;
  providerMessageId: string | null;
  requestedBy: string;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
}

export type ApplicationCommunicationTemplateKey =
  | "FIRST_CONTACT"
  | "FOLLOW_UP"
  | "INTERVIEW_SCHEDULED"
  | "OFFER_FOLLOW_UP"
  | "HIRED_CONFIRMATION"
  | "REJECTION_NOTICE";

export interface ApplicationCommunicationTemplateView {
  key: ApplicationCommunicationTemplateKey;
  label: string;
  subject: string;
  body: string;
  recommended: boolean;
  reason: string;
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

export class ApplicationCommunicationApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "APPLICATION_COMMUNICATION_API_ERROR"
  ) {
    super(message);
    this.name =
      "ApplicationCommunicationApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApplicationCommunicationApiError(
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

    throw new ApplicationCommunicationApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "AUTH_TOKEN_FAILED"
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
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      }
    );
  } catch (error) {
    console.error(
      "Application communication request failed:",
      error
    );

    throw new ApplicationCommunicationApiError(
      "커뮤니케이션 서버에 연결할 수 없습니다.",
      0,
      "NETWORK_ERROR"
    );
  }

  let body:
    ApiResponse<T> | null = null;

  try {
    body =
      (await response.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (
    !response.ok ||
    !body ||
    body.success !== true
  ) {
    const errorBody =
      body &&
      body.success === false
        ? body
        : null;

    throw new ApplicationCommunicationApiError(
      errorBody?.error ||
        "커뮤니케이션 요청을 처리하지 못했습니다.",
      response.status,
      errorBody?.code ||
        "COMMUNICATION_REQUEST_FAILED"
    );
  }

  return body.data;
}

function applicationCommunicationUrl(
  applicationId: string
): string {
  return `/api/b2b/applications/${encodeURIComponent(
    applicationId
  )}/communications`;
}

export async function listApplicationCommunicationsViaApi(
  applicationId: string
): Promise<ApplicationCommunicationView[]> {
  return authorizedRequest<
    ApplicationCommunicationView[]
  >(
    applicationCommunicationUrl(
      applicationId
    ),
    {
      method: "GET",
    }
  );
}

export async function listApplicationCommunicationTemplatesViaApi(
  applicationId: string
): Promise<ApplicationCommunicationTemplateView[]> {
  return authorizedRequest<
    ApplicationCommunicationTemplateView[]
  >(
    `${applicationCommunicationUrl(
      applicationId
    )}/templates`,
    {
      method: "GET",
    }
  );
}

export async function sendApplicationEmailViaApi(
  applicationId: string,
  input: {
    requestId: string;
    subject: string;
    body: string;
  }
): Promise<ApplicationCommunicationView> {
  return authorizedRequest<
    ApplicationCommunicationView
  >(
    applicationCommunicationUrl(
      applicationId
    ),
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}
