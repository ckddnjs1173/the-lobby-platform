import { NextResponse } from "next/server";

import {
  MAX_RESUME_FILE_BYTES,
  ResumeFileExtractionError,
  extractResumeTextFromFile,
  type ResumeUploadFile,
} from "../../../lib/server/resumeFileExtractionService";
import {
  ResumeParsingServiceError,
  parseResumeText,
} from "../../../lib/server/resumeParsingService";
import {
  consumeRateLimit,
  createRateLimitHeaders,
  getRequestClientKey,
} from "../../../lib/server/requestRateLimit";

export const runtime = "nodejs";

const PUBLIC_RESUME_PARSE_LIMIT = 5;
const PUBLIC_RESUME_PARSE_WINDOW_MS = 60_000;
const MAX_MULTIPART_REQUEST_BYTES = MAX_RESUME_FILE_BYTES + 1024 * 1024;
const AI_TRANSFER_CONSENT_HEADER = "x-ai-transfer-consent";
const AI_TRANSFER_CONSENT_VERSION = "groq-us-2026-08-25";

function isResumeUploadFile(value: unknown): value is ResumeUploadFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<ResumeUploadFile>;
  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    typeof file.arrayBuffer === "function"
  );
}

async function parseJsonResume(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ResumeParsingServiceError(
      "요청 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_JSON_BODY"
    );
  }

  const resumeText =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as { resumeText?: unknown }).resumeText
      : undefined;

  return {
    parsed: await parseResumeText(resumeText),
    source: null,
  };
}

async function parseMultipartResume(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_MULTIPART_REQUEST_BYTES
  ) {
    throw new ResumeFileExtractionError(
      "업로드 요청 크기가 허용 범위를 초과했습니다.",
      413,
      "RESUME_UPLOAD_REQUEST_TOO_LARGE"
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

  if (!isResumeUploadFile(file)) {
    throw new ResumeFileExtractionError(
      "분석할 이력서 파일을 선택해주세요.",
      400,
      "RESUME_FILE_REQUIRED"
    );
  }

  const extraction = await extractResumeTextFromFile(file);

  return {
    parsed: await parseResumeText(extraction.text),
    source: {
      fileName: extraction.fileName,
      fileType: extraction.kind,
      extractedCharacters: extraction.extractedCharacters,
    },
  };
}

export async function POST(request: Request) {
  if (
    request.headers.get(AI_TRANSFER_CONSENT_HEADER) !==
    AI_TRANSFER_CONSENT_VERSION
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "AI 이력서 분석을 이용하려면 미국 국외 처리 안내에 동의해야 합니다.",
        code: "AI_TRANSFER_CONSENT_REQUIRED",
      },
      { status: 400 }
    );
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = consumeRateLimit(
    `public-resume-parse:${clientKey}`,
    {
      limit: PUBLIC_RESUME_PARSE_LIMIT,
      windowMs: PUBLIC_RESUME_PARSE_WINDOW_MS,
    }
  );
  const rateLimitHeaders = createRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "이력서 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    );
  }

  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() || "";
    const result = contentType.startsWith("multipart/form-data")
      ? await parseMultipartResume(request)
      : await parseJsonResume(request);

    return NextResponse.json(
      {
        success: true,
        data: result.parsed,
        source: result.source,
        notice:
          "입력한 이력서 원문은 Groq LLC의 미국 인프라에서 AI 구조화에 사용될 수 있으며, 업로드 원본 파일 자체와 이력서 원문은 The Lobby Firestore에 저장하지 않습니다.",
      },
      {
        headers: rateLimitHeaders,
      }
    );
  } catch (error) {
    if (
      error instanceof ResumeParsingServiceError ||
      error instanceof ResumeFileExtractionError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        {
          status: error.status,
          headers: rateLimitHeaders,
        }
      );
    }

    console.error("AI Resume Parse Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "이력서 분석 중 오류가 발생했습니다.",
        code: "INTERNAL_SERVER_ERROR",
      },
      {
        status: 500,
        headers: rateLimitHeaders,
      }
    );
  }
}
