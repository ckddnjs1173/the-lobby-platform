import { NextResponse } from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../lib/server/b2bAuthorization";

import {
  ApplicationServiceError,
  updateApplicationStage,
} from "../../../../../lib/server/applicationService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface StageRequestBody {
  stage?: unknown;
  note?: unknown;
}

interface RouteContext {
  params: Promise<{
    applicationId: string;
  }>;
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
    B2BAuthorizationError
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
    "PATCH application stage failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원 단계 변경 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    /**
     * 실제 요청자를 Firebase Admin에서 검증한다.
     */
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    const {
      applicationId,
    } = await context.params;

    if (!applicationId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "지원 ID가 필요합니다.",
          code:
            "APPLICATION_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    let body: StageRequestBody;

    try {
      body =
        (await request.json()) as StageRequestBody;
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

    const note =
      typeof body.note === "string"
        ? body.note
        : undefined;

    /**
     * actor UID는 Request Body에서 받지 않는다.
     *
     * Firebase ID Token에서 검증된 UID를 서버가 강제 사용한다.
     */
    const result =
      await updateApplicationStage(
        authenticatedUser.uid,
        applicationId,
        body.stage,
        note
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}