"use client";

import {
  auth,
} from "./firebase";

import type {
  ApplicationStage,
  CareerItem,
  EducationItem,
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

export interface CreatePassiveCandidateInput {
  name: string;
  phone: string;
  email: string;
  headline?: string;
  careerSummary?: string;
  skills?: string[];
  careers?: CareerItem[];
  education?: EducationItem[];
}

export interface CreatePassiveCandidateResult {
  candidateId: string;
  authUid: null;
  source: "B2B_DIRECT";
  accountStatus: "ACTIVE";
  createdBy: string;
  actorRole: "ADMIN" | "RECRUITER";
  actorOrganizationId: string;
  profileCompleteness: number;
}

export interface ResumeParseResult {
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
  profileCompleteness: number;
}

export interface CreateDirectApplicationResult {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  stage: ApplicationStage;
  source: "B2B_DIRECT";
}

export class CandidateWorkflowApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "CANDIDATE_WORKFLOW_API_ERROR"
  ) {
    super(message);
    this.name = "CandidateWorkflowApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new CandidateWorkflowApiError(
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

    throw new CandidateWorkflowApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function parseResponse<T>(
  response: Response
): Promise<T> {
  let payload: ApiResponse<T> | null = null;

  try {
    payload =
      (await response.json()) as ApiResponse<T>;
  } catch (error) {
    console.error(
      "Candidate workflow API response parse error:",
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

    throw new CandidateWorkflowApiError(
      errorPayload?.error ||
        "후보자 요청을 처리할 수 없습니다.",
      response.status || 500,
      errorPayload?.code ||
        "CANDIDATE_WORKFLOW_API_ERROR"
    );
  }

  return payload.data;
}

async function authorizedPost<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "Candidate workflow API network error:",
      error
    );

    throw new CandidateWorkflowApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  return parseResponse<T>(
    response
  );
}

async function authorizedMultipartPost<T>(
  url: string,
  formData: FormData
): Promise<T> {
  const idToken =
    await getFirebaseIdToken();

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: formData,
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "Candidate file upload network error:",
      error
    );

    throw new CandidateWorkflowApiError(
      "이력서 파일을 서버에 전송할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  return parseResponse<T>(
    response
  );
}

export async function parsePassiveCandidateResumeViaApi(
  resumeText: string
): Promise<ResumeParseResult> {
  return authorizedPost<ResumeParseResult>(
    "/api/b2b/candidates/parse-resume",
    {
      resumeText:
        resumeText.trim(),
    }
  );
}

export async function parsePassiveCandidateResumeFileViaApi(
  file: File
): Promise<ResumeParseResult> {
  const formData = new FormData();
  formData.set("file", file);

  return authorizedMultipartPost<ResumeParseResult>(
    "/api/b2b/candidates/parse-resume",
    formData
  );
}

export async function createPassiveCandidateViaApi(
  input: CreatePassiveCandidateInput
): Promise<CreatePassiveCandidateResult> {
  return authorizedPost<CreatePassiveCandidateResult>(
    "/api/b2b/candidates",
    input as unknown as Record<string, unknown>
  );
}

export async function createDirectApplicationViaApi(
  candidateId: string,
  jobId: string
): Promise<CreateDirectApplicationResult> {
  return authorizedPost<CreateDirectApplicationResult>(
    "/api/b2b/applications",
    {
      candidateId: candidateId.trim(),
      jobId: jobId.trim(),
    }
  );
}
