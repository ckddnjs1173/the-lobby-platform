import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../lib/server/b2bAuthorization";

import {
  JobServiceError,
  updateB2BJob,
} from "../../../../../lib/server/jobService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof JobServiceError
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
    "PATCH B2B job failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "공고 수정 중 서버 오류가 발생했습니다.",
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
    const authenticatedUser =
      await requireFirebaseUser(request);

    const {
      jobId,
    } = await context.params;

    let body: unknown;

    try {
      body = await request.json();
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

    const result =
      await updateB2BJob(
        authenticatedUser.uid,
        jobId || "",
        body
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
