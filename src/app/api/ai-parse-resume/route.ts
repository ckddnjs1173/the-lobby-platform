import {
  NextResponse,
} from "next/server";

import {
  ResumeParsingServiceError,
  parseResumeText,
} from "../../../lib/server/resumeParsingService";
import {
  consumeRateLimit,
  createRateLimitHeaders,
  getRequestClientKey,
} from "../../../lib/server/requestRateLimit";

export const runtime =
  "nodejs";

const PUBLIC_RESUME_PARSE_LIMIT = 5;
const PUBLIC_RESUME_PARSE_WINDOW_MS = 60_000;

export async function POST(
  request: Request
) {
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
        error:
          "이력서 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        code:
          "RATE_LIMITED",
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    );
  }

  try {
    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "요청 데이터 형식이 올바르지 않습니다.",
          code:
            "INVALID_JSON_BODY",
        },
        {
          status: 400,
          headers: rateLimitHeaders,
        }
      );
    }

    const resumeText =
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body)
        ? (
            body as {
              resumeText?: unknown;
            }
          ).resumeText
        : undefined;

    const parsedProfile =
      await parseResumeText(
        resumeText
      );

    return NextResponse.json(
      {
        success: true,
        data:
          parsedProfile,
        notice:
          "입력한 이력서 원문은 프로필 구조화에만 사용되며 The Lobby Firestore에는 원문 자체를 저장하지 않습니다.",
      },
      {
        headers: rateLimitHeaders,
      }
    );
  } catch (error) {
    if (
      error instanceof
      ResumeParsingServiceError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
          code:
            error.code,
        },
        {
          status:
            error.status,
          headers: rateLimitHeaders,
        }
      );
    }

    console.error(
      "AI Resume Parse Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "이력서 분석 중 오류가 발생했습니다.",
        code:
          "INTERNAL_SERVER_ERROR",
      },
      {
        status: 500,
        headers: rateLimitHeaders,
      }
    );
  }
}
