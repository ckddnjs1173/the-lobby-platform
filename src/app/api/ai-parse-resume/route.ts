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
          "입력한 이력서 원문과 업로드 원본 파일은 프로필 구조화에만 사용되며 The Lobby Firestore에는 저장하지 않습니다.",
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
