"use client";

import { auth } from "./firebase";

export interface JobDescriptionParseResult {
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
}

interface ParseJobDescriptionResponse {
  success?: boolean;
  data?: JobDescriptionParseResult;
  error?: string;
  code?: string;
}

export class JobDescriptionApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 500,
    code = "JOB_DESCRIPTION_API_ERROR"
  ) {
    super(message);
    this.name = "JobDescriptionApiError";
    this.status = status;
    this.code = code;
  }
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new JobDescriptionApiError(
      "관리자 로그인이 필요합니다.",
      401,
      "AUTH_REQUIRED"
    );
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Failed to get Firebase ID token for JD parse:", error);
    throw new JobDescriptionApiError(
      "로그인 인증 정보를 확인할 수 없습니다.",
      401,
      "ID_TOKEN_FAILED"
    );
  }
}

async function parseResponse(response: Response): Promise<JobDescriptionParseResult> {
  let payload: ParseJobDescriptionResponse | null = null;
  try {
    payload = (await response.json()) as ParseJobDescriptionResponse;
  } catch (error) {
    console.error("JD parse response parse failed:", error);
  }

  if (!response.ok || !payload?.success || !payload.data) {
    throw new JobDescriptionApiError(
      payload?.error || "채용공고 변환 요청을 처리할 수 없습니다.",
      response.status || 500,
      payload?.code || "JOB_DESCRIPTION_API_ERROR"
    );
  }

  return payload.data;
}

export async function parseJobDescriptionTextViaApi(input: {
  jobText: string;
  maskCompany: boolean;
}): Promise<JobDescriptionParseResult> {
  const idToken = await getFirebaseIdToken();
  const response = await fetch("/api/b2b/jobs/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function parseJobDescriptionFileViaApi(input: {
  file: File;
  maskCompany: boolean;
}): Promise<JobDescriptionParseResult> {
  const idToken = await getFirebaseIdToken();
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("maskCompany", input.maskCompany ? "true" : "false");

  const response = await fetch("/api/b2b/jobs/parse", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
    cache: "no-store",
  });

  return parseResponse(response);
}
