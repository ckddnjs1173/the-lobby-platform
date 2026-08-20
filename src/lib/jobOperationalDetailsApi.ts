"use client";

import { auth } from "./firebase";

export interface JobOperationalDetailsView {
  jobId: string;
  organizationId: string;
  workplaceName: string;
  employingCompany: string;
  salaryBase: string;
  salaryIncentive: string;
  salaryAllowances: string;
  severancePay: string;
  workSchedule: string;
  workHours: string;
  breakTime: string;
  contractPeriod: string;
  conversionOpportunity: string;
  experienceLevel: string;
  educationLevel: string;
  headcount: string;
  benefits: string[];
  nearbyTransit: string;
  detailedLocation: string;
  applicationDeadline: string;
  interviewSchedule: string;
  expectedStartDate: string;
  hiringScheduleNote: string;
  updatedAt: string | null;
}

export type JobOperationalDetailsInput = Omit<
  JobOperationalDetailsView,
  "jobId" | "organizationId" | "updatedAt"
>;

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

export class JobOperationalDetailsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "JOB_OPERATIONAL_DETAILS_API_ERROR"
  ) {
    super(message);
    this.name = "JobOperationalDetailsApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(jobId: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new JobOperationalDetailsApiError(
      "관리자 로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const token = await user.getIdToken();
  const response = await fetch(
    `/api/b2b/jobs/${encodeURIComponent(jobId)}/details`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
      cache: "no-store",
    }
  );

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const errorPayload = payload && payload.success === false ? payload : null;
    throw new JobOperationalDetailsApiError(
      errorPayload?.error || "공고 상세조건 요청을 처리하지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "JOB_OPERATIONAL_DETAILS_REQUEST_FAILED"
    );
  }

  return payload.data;
}

export async function fetchJobOperationalDetails(
  jobId: string
): Promise<JobOperationalDetailsView> {
  return request<JobOperationalDetailsView>(jobId);
}

export async function updateJobOperationalDetailsViaApi(
  jobId: string,
  input: JobOperationalDetailsInput
): Promise<JobOperationalDetailsView> {
  return request<JobOperationalDetailsView>(jobId, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
