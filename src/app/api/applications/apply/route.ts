import { NextResponse } from "next/server";

import {
  ApplicationServiceError,
  createB2CApplication,
} from "../../../../lib/server/applicationService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

/**
 * Firebase Admin SDK를 사용하므로
 * Node.js Runtime을 명시한다.
 */
export const runtime = "nodejs";

interface ApplyRequestBody {
  jobId?: unknown;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (error instanceof ServerAuthError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      {
        status: error.status,
      }
    );
  }

  if (
    error instanceof
    ApplicationServiceError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      {
        status: error.status,
      }
    );
  }

  console.error(
    "POST /api/applications/apply failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
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
    /**
     * Firebase ID Token 검증.
     */
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    let body: ApplyRequestBody;

    try {
      body =
        (await request.json()) as ApplyRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "요청 데이터 형식이 올바르지 않습니다.",
          code: "INVALID_JSON_BODY",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.jobId !== "string" ||
      !body.jobId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "지원할 공고 ID가 필요합니다.",
          code: "JOB_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * candidateId/source/authUid 등은
     * 클라이언트 Body에서 받지 않는다.
     */
    const result =
      await createB2CApplication(
        authenticatedUser.uid,
        body.jobId
      );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}