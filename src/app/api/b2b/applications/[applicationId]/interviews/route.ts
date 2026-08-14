import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../lib/server/b2bAuthorization";

import {
  InterviewServiceError,
  listApplicationInterviews,
  scheduleApplicationInterview,
} from "../../../../../../lib/server/interviewService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    applicationId: string;
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
        error: error.message,
        code: error.code,
      },
      {
        status: error.status,
      }
    );
  }

  console.error(
    "Application interview API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "면접 일정 요청 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function GET(
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
    } = await context.params;

    const interviews =
      await listApplicationInterviews(
        authenticatedUser.uid,
        applicationId
      );

    return NextResponse.json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
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
          code: "INVALID_JSON_BODY",
        },
        {
          status: 400,
        }
      );
    }

    const interview =
      await scheduleApplicationInterview(
        authenticatedUser.uid,
        applicationId,
        body
      );

    return NextResponse.json(
      {
        success: true,
        data: interview,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
