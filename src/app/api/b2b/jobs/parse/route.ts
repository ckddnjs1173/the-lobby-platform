import { NextResponse } from "next/server";

import {
  B2BAuthorizationError,
  requireB2BActor,
} from "../../../../../../lib/server/b2bAuthorization";
import {
  JobDescriptionParsingServiceError,
  parseJobDescriptionText,
} from "../../../../../../lib/server/jobDescriptionParsingService";
import {
  MAX_RESUME_FILE_BYTES,
  ResumeFileExtractionError,
  extractResumeTextFromFile,
  type ResumeUploadFile,
} from "../../../../../../lib/server/resumeFileExtractionService";
import {
  createRateLimitHeaders,
  consumeRateLimit,
} from "../../../../../../lib/server/requestRateLimit";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

const MAX_MULTIPART_REQUEST_BYTES = MAX_RESUME_FILE_BYTES + 1024 * 1024;

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof JobDescriptionParsingServiceError ||
    error instanceof ResumeFileExtractionError
  ) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("B2B job description parse API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "채용공고 분석 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

function isUploadFile(value: unknown): value is ResumeUploadFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<ResumeUploadFile>;
  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    typeof file.arrayBuffer === "function"
  );
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === "on";
}

async function parseJsonJobDescription(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new JobDescriptionParsingServiceError(
      "요청 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_JSON_BODY"
    );
  }

  const record =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  return {
    parsed: await parseJobDescriptionText(record.jobText, {
      maskCompany: parseBoolean(record.maskCompany),
    }),
    source: null,
  };
}

async function parseMultipartJobDescription(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_MULTIPART_REQUEST_BYTES
  ) {
    throw new ResumeFileExtractionError(
      "업로드 요청 크기가 허용 범위를 초과했습니다.",
      413,
      "JOB_UPLOAD_REQUEST_TOO_LARGE"
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new ResumeFileExtractionError(
      "업로드 요청 형식을 확인할 수 없습니다.",
      400,
      "INVALID_MULTIPART_BODY"
    );
  }

  const file = formData.get("file");
  if (!isUploadFile(file)) {
    throw new ResumeFileExtractionError(
      "분석할 채용공고 파일을 선택해주세요.",
      400,
      "JOB_FILE_REQUIRED"
    );
  }

  const extraction = await extractResumeTextFromFile(file);
  return {
    parsed: await parseJobDescriptionText(extraction.text, {
      maskCompany: parseBoolean(formData.get("maskCompany")),
    }),
    source: {
      fileName: extraction.fileName,
      fileType: extraction.kind,
      extractedCharacters: extraction.extractedCharacters,
    },
  };
}

export async function POST(request: Request) {
  try {
    const authenticatedUser = await requireFirebaseUser(request);
    const actor = await requireB2BActor(authenticatedUser.uid);

    const rateLimit = consumeRateLimit(`b2b-jd-parse:${actor.uid}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "AI 공고 변환 요청이 많습니다. 잠시 후 다시 시도해주세요.",
          code: "RATE_LIMITED",
        },
        { status: 429, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() || "";
    const result = contentType.startsWith("multipart/form-data")
      ? await parseMultipartJobDescription(request)
      : await parseJsonJobDescription(request);

    return NextResponse.json(
      {
        success: true,
        data: result.parsed,
        source: result.source,
        notice:
          "입력한 채용공고 원문과 업로드 원본 파일은 양식 변환에만 사용되며 The Lobby Firestore에는 저장하지 않습니다. 변환 결과를 검토한 뒤 공고를 저장해주세요.",
      },
      { headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
