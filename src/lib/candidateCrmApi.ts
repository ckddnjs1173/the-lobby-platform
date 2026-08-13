"use client";

import {
  auth,
} from "./firebase";

import type {
  ApplicationSource,
  ApplicationStage,
  CareerItem,
  EducationItem,
} from "../types";

export interface CandidateCrmDetail {
  candidateId: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  source: "B2B_DIRECT";
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdBy: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: EducationItem[];
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
  profileUpdatedAt: string | null;
}

export interface CandidatePlacementItem {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  stage: ApplicationStage;
  source: ApplicationSource;
  jobTitle: string;
  company: string;
  appliedAt: string | null;
  updatedAt: string | null;
  lastActivityAt: string | null;
}

export interface UpdateCandidateCrmInput {
  name: string;
  phone: string;
  email: string;
  headline: string;
  careerSummary: string;
  skills: string[];
}

export interface UpdateCandidateCrmResult {
  changed: boolean;
  changedFields: string[];
  candidate: CandidateCrmDetail;
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

export class CandidateCrmApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "CANDIDATE_CRM_API_ERROR"
  ) {
    super(message);
    this.name = "CandidateCrmApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new CandidateCrmApiError(
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

    throw new CandidateCrmApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function authorizedRequest<T>(
  url: string,
  method: "GET" | "PATCH",
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
      "Candidate CRM network error:",
      error
    );

    throw new CandidateCrmApiError(
      "서버에 연결할 수 없습니다.",
      503,
      "NETWORK_ERROR"
    );
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (error) {
    console.error(
      "Candidate CRM response parse error:",
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

    throw new CandidateCrmApiError(
      errorPayload?.error ||
        "후보자 요청을 처리할 수 없습니다.",
      response.status || 500,
      errorPayload?.code ||
        "CANDIDATE_CRM_API_ERROR"
    );
  }

  return payload.data;
}

function normalizeCandidateId(
  candidateId: string
): string {
  const normalized = candidateId.trim();

  if (!normalized) {
    throw new CandidateCrmApiError(
      "후보자 ID가 없습니다.",
      400,
      "CANDIDATE_ID_REQUIRED"
    );
  }

  return normalized;
}

export async function fetchCandidateCrmDetail(
  candidateId: string
): Promise<CandidateCrmDetail> {
  const normalizedCandidateId =
    normalizeCandidateId(candidateId);

  return authorizedRequest<CandidateCrmDetail>(
    `/api/b2b/candidates/${encodeURIComponent(
      normalizedCandidateId
    )}`,
    "GET"
  );
}

export async function fetchCandidatePlacements(
  candidateId: string
): Promise<CandidatePlacementItem[]> {
  const normalizedCandidateId =
    normalizeCandidateId(candidateId);

  return authorizedRequest<CandidatePlacementItem[]>(
    `/api/b2b/candidates/${encodeURIComponent(
      normalizedCandidateId
    )}/applications`,
    "GET"
  );
}

export async function updateCandidateCrmDetail(
  candidateId: string,
  input: UpdateCandidateCrmInput
): Promise<UpdateCandidateCrmResult> {
  const normalizedCandidateId =
    normalizeCandidateId(candidateId);

  return authorizedRequest<UpdateCandidateCrmResult>(
    `/api/b2b/candidates/${encodeURIComponent(
      normalizedCandidateId
    )}`,
    "PATCH",
    {
      name: input.name,
      phone: input.phone,
      email: input.email,
      headline: input.headline,
      careerSummary: input.careerSummary,
      skills: input.skills,
    }
  );
}
