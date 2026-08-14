"use client";

import {
  auth,
} from "./firebase";

export interface AssignableRecruiter {
  uid: string;
  name: string;
  email: string;
  organizationId: string;
}

export interface AssignApplicationRecruiterResult {
  applicationId: string;
  recruiterId: string;
  recruiterName: string;
  changed: boolean;
}

export type InterviewMethod =
  | "ONSITE"
  | "VIDEO"
  | "PHONE";

export type InterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED";

export type InterviewResult =
  | "PASS"
  | "FAIL"
  | "HOLD"
  | "NO_SHOW";

export interface ApplicationInterviewView {
  interviewId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  scheduledAt: string;
  method: InterviewMethod;
  location: string | null;
  interviewer: string | null;
  note: string | null;
  status: InterviewStatus;
  result: InterviewResult | null;
  cancelReason: string | null;
  createdBy: string;
  completedBy: string | null;
  canceledBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
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

export class ApplicationOperationsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "APPLICATION_OPERATIONS_API_ERROR"
  ) {
    super(message);
    this.name = "ApplicationOperationsApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApplicationOperationsApiError(
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

    throw new ApplicationOperationsApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function authorizedRequest<T>(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
): Promise<T> {
  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(
      url,
      {
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
              body:
                JSON.stringify(body),
            }
          : {}),
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Application operations network error:",
      error
    );

    throw new ApplicationOperationsApiError(
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
      "Application operations response parse error:",
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

    throw new ApplicationOperationsApiError(
      errorPayload?.error ||
        "지원 운영 요청을 처리할 수 없습니다.",
      response.status || 500,
      errorPayload?.code ||
        "APPLICATION_OPERATIONS_API_ERROR"
    );
  }

  return payload.data;
}

function normalizeApplicationId(
  applicationId: string
): string {
  const normalized =
    applicationId.trim();

  if (!normalized) {
    throw new ApplicationOperationsApiError(
      "지원 ID가 없습니다.",
      400,
      "APPLICATION_ID_REQUIRED"
    );
  }

  return normalized;
}

function normalizeInterviewId(
  interviewId: string
): string {
  const normalized =
    interviewId.trim();

  if (!normalized) {
    throw new ApplicationOperationsApiError(
      "면접 ID가 없습니다.",
      400,
      "INTERVIEW_ID_REQUIRED"
    );
  }

  return normalized;
}

function interviewLifecycleUrl(
  applicationId: string,
  interviewId: string
): string {
  return `/api/b2b/applications/${encodeURIComponent(
    normalizeApplicationId(
      applicationId
    )
  )}/interviews/${encodeURIComponent(
    normalizeInterviewId(
      interviewId
    )
  )}`;
}

export async function fetchAssignableRecruiters(
  organizationId: string
): Promise<AssignableRecruiter[]> {
  const normalizedOrganizationId =
    organizationId.trim();

  if (!normalizedOrganizationId) {
    throw new ApplicationOperationsApiError(
      "조직 ID가 없습니다.",
      400,
      "ORGANIZATION_ID_REQUIRED"
    );
  }

  return authorizedRequest<
    AssignableRecruiter[]
  >(
    `/api/b2b/recruiters?organizationId=${encodeURIComponent(
      normalizedOrganizationId
    )}`,
    "GET"
  );
}

export async function assignApplicationRecruiterViaApi(
  applicationId: string,
  recruiterId: string,
  note?: string
): Promise<AssignApplicationRecruiterResult> {
  const normalizedApplicationId =
    normalizeApplicationId(
      applicationId
    );

  const normalizedRecruiterId =
    recruiterId.trim();

  if (!normalizedRecruiterId) {
    throw new ApplicationOperationsApiError(
      "담당자를 선택해주세요.",
      400,
      "RECRUITER_ID_REQUIRED"
    );
  }

  return authorizedRequest<
    AssignApplicationRecruiterResult
  >(
    `/api/b2b/applications/${encodeURIComponent(
      normalizedApplicationId
    )}/assignee`,
    "PATCH",
    {
      recruiterId:
        normalizedRecruiterId,
      ...(note?.trim()
        ? {
            note: note.trim(),
          }
        : {}),
    }
  );
}

export async function fetchApplicationInterviews(
  applicationId: string
): Promise<ApplicationInterviewView[]> {
  const normalizedApplicationId =
    normalizeApplicationId(
      applicationId
    );

  return authorizedRequest<
    ApplicationInterviewView[]
  >(
    `/api/b2b/applications/${encodeURIComponent(
      normalizedApplicationId
    )}/interviews`,
    "GET"
  );
}

export async function scheduleApplicationInterviewViaApi(
  applicationId: string,
  input: {
    scheduledAt: string;
    method: InterviewMethod;
    location?: string;
    interviewer?: string;
    note?: string;
  }
): Promise<ApplicationInterviewView> {
  const normalizedApplicationId =
    normalizeApplicationId(
      applicationId
    );

  return authorizedRequest<
    ApplicationInterviewView
  >(
    `/api/b2b/applications/${encodeURIComponent(
      normalizedApplicationId
    )}/interviews`,
    "POST",
    {
      scheduledAt:
        input.scheduledAt,
      method:
        input.method,
      ...(input.location?.trim()
        ? {
            location:
              input.location.trim(),
          }
        : {}),
      ...(input.interviewer?.trim()
        ? {
            interviewer:
              input.interviewer.trim(),
          }
        : {}),
      ...(input.note?.trim()
        ? {
            note:
              input.note.trim(),
          }
        : {}),
    }
  );
}

export async function updateApplicationInterviewViaApi(
  applicationId: string,
  interviewId: string,
  input: {
    scheduledAt: string;
    method: InterviewMethod;
    location?: string;
    interviewer?: string;
    note?: string;
  }
): Promise<ApplicationInterviewView> {
  return authorizedRequest<
    ApplicationInterviewView
  >(
    interviewLifecycleUrl(
      applicationId,
      interviewId
    ),
    "PATCH",
    {
      action: "UPDATE",
      scheduledAt:
        input.scheduledAt,
      method:
        input.method,
      location:
        input.location || "",
      interviewer:
        input.interviewer || "",
      note:
        input.note || "",
    }
  );
}

export async function cancelApplicationInterviewViaApi(
  applicationId: string,
  interviewId: string,
  reason: string
): Promise<ApplicationInterviewView> {
  const normalizedReason =
    reason.trim();

  if (!normalizedReason) {
    throw new ApplicationOperationsApiError(
      "면접 취소 사유를 입력해주세요.",
      400,
      "INTERVIEW_REASON_REQUIRED"
    );
  }

  return authorizedRequest<
    ApplicationInterviewView
  >(
    interviewLifecycleUrl(
      applicationId,
      interviewId
    ),
    "PATCH",
    {
      action: "CANCEL",
      reason:
        normalizedReason,
    }
  );
}

export async function completeApplicationInterviewViaApi(
  applicationId: string,
  interviewId: string,
  result: InterviewResult,
  note?: string
): Promise<ApplicationInterviewView> {
  return authorizedRequest<
    ApplicationInterviewView
  >(
    interviewLifecycleUrl(
      applicationId,
      interviewId
    ),
    "PATCH",
    {
      action: "COMPLETE",
      result,
      ...(note?.trim()
        ? {
            note:
              note.trim(),
          }
        : {}),
    }
  );
}
