"use client";

import { auth } from "./firebase";

export interface B2BOrganizationView {
  organizationId: string;
  name: string;
  status: string;
}

interface ApiSuccess {
  success: true;
  data: B2BOrganizationView[];
}

interface ApiFailure {
  success: false;
  error: string;
  code?: string;
}

export class OrganizationApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 500, code = "ORGANIZATION_API_ERROR") {
    super(message);
    this.name = "OrganizationApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchB2BOrganizations(): Promise<B2BOrganizationView[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new OrganizationApiError("관리자 로그인이 필요합니다.", 401, "AUTH_REQUIRED");
  }

  const token = await user.getIdToken();
  let response: Response;

  try {
    response = await fetch("/api/b2b/organizations", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("Organization list network error:", error);
    throw new OrganizationApiError("서버에 연결할 수 없습니다.", 503, "NETWORK_ERROR");
  }

  let payload: ApiSuccess | ApiFailure | null = null;
  try {
    payload = (await response.json()) as ApiSuccess | ApiFailure;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const failure = payload && payload.success === false ? payload : null;
    throw new OrganizationApiError(
      failure?.error || "조직 목록을 불러오지 못했습니다.",
      response.status || 500,
      failure?.code || "ORGANIZATION_LIST_FAILED"
    );
  }

  return payload.data;
}
