import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../../lib/server/b2bAuthorization";

import {
  InterviewServiceError,
  cancelApplicationInterview,
  completeApplicationInterview,
  updateApplicationInterview,
} from "../../../../../../../lib/server/interviewService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    applicationId: string;
    interviewId: string;
  }>;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof InterviewServiceError
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
    "Interview lifecycle API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "면접 상태 변경 중 서버 오류가 발생했습니다.",
      code:
        "INTERNAL_SERVER_ERROR",
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
      await requireFirebaseUser(
        request
      );

    const {
      applicationId,
      interviewId,
    } = await context.params;

    let body: Record<string, unknown>;

    try {
      body =
        (await request.json()) as Record<
          string,
          unknown
        >;
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

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    if (action === "UPDATE") {
      const interview =
        await updateApplicationInterview(
          authenticatedUser.uid,
          applicationId,
          interviewId,
          body
        );

      return NextResponse.json({
        success: true,
        data:
          interview,
      });
    }

    if (action === "CANCEL") {
      const interview =
        await cancelApplicationInterview(
          authenticatedUser.uid,
          applicationId,
          interviewId,
          body.reason
        );

      return NextResponse.json({
        success: true,
        data:
          interview,
      });
    }

    if (action === "COMPLETE") {
      const interview =
        await completeApplicationInterview(
          authenticatedUser.uid,
          applicationId,
          interviewId,
          body.result,
          body.note
        );

      return NextResponse.json({
        success: true,
        data:
          interview,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "지원하지 않는 면접 작업입니다.",
        code:
          "INVALID_INTERVIEW_ACTION",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    return errorResponse(
      error
    );
  }
}
