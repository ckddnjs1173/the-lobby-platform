import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
  requireB2BActor,
} from "../../../../../lib/server/b2bAuthorization";

import {
  ResumeParsingServiceError,
  parseResumeText,
} from "../../../../../lib/server/resumeParsingService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../lib/server/serverAuth";

export const runtime =
  "nodejs";

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof
    ServerAuthError ||
    error instanceof
    B2BAuthorizationError ||
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
      }
    );
  }

  console.error(
    "B2B resume parse API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "이력서 분석 중 서버 오류가 발생했습니다.",
      code:
        "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    await requireB2BActor(
      authenticatedUser.uid
    );

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

    const result =
      await parseResumeText(
        resumeText
      );

    return NextResponse.json({
      success: true,
      data:
        result,
      notice:
        "입력한 이력서 원문은 프로필 구조화에만 사용되며 The Lobby Firestore에는 원문 자체를 저장하지 않습니다.",
    });
  } catch (error) {
    return errorResponse(
      error
    );
  }
}
