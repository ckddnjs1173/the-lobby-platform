"use client";

import { auth } from "./firebase";
import type { TalentOpportunityView } from "./talentOpportunityTypes";

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

export class TalentOpportunityApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "TALENT_OPPORTUNITY_API_ERROR"
  ) {
    super(message);
    this.name = "TalentOpportunityApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new TalentOpportunityApiError(
      "로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const token = await user.getIdToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
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
    throw new TalentOpportunityApiError(
      errorPayload?.error || "채용 제안 요청을 처리하지 못했습니다.",
      response.status || 500,
      errorPayload?.code || "TALENT_OPPORTUNITY_REQUEST_FAILED"
    );
  }

  return payload.data;
}

export async function createTalentOpportunityViaApi(input: {
  candidateId: string;
  jobId: string;
  note?: string;
}): Promise<TalentOpportunityView> {
  return request<TalentOpportunityView>("/api/b2b/talent-opportunities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchCandidateTalentOpportunities(): Promise<TalentOpportunityView[]> {
  return request<TalentOpportunityView[]>("/api/candidate/opportunities");
}

export async function respondToTalentOpportunityViaApi(
  opportunityId: string,
  decision: "ACCEPT" | "DECLINE"
): Promise<TalentOpportunityView> {
  return request<TalentOpportunityView>(
    `/api/candidate/opportunities/${encodeURIComponent(opportunityId)}/respond`,
    {
      method: "POST",
      body: JSON.stringify({ decision }),
    }
  );
}
