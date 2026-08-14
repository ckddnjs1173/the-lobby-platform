import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../lib/server/b2bAuthorization";

import {
  ApplicationCommunicationServiceError,
  listApplicationCommunications,
  sendApplicationEmail,
} from "../../../../../../lib/server/applicationCommunicationService";

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
    error instanceof ApplicationCommunicationServiceError
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
    "Application communication API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원자 커뮤니케이션 처리 중 서버 오류가 발생했습니다.",
      code:
        "INTERNAL_SERVER_ERROR",
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

    const communications =
      await listApplicationCommunications(
        authenticatedUser.uid,
        applicationId
      );

    return NextResponse.json({
      success: true,
      data: communications,
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
          code:
            "INVALID_JSON_BODY",
        },
        {
          status: 400,
        }
      );
    }

    const communication =
      await sendApplicationEmail(
        authenticatedUser.uid,
        applicationId,
        body
      );

    return NextResponse.json(
      {
        success: true,
        data: communication,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
