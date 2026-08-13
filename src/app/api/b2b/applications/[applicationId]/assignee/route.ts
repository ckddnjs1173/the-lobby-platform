import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../lib/server/b2bAuthorization";

import {
  ApplicationOperationsServiceError,
  assignApplicationRecruiter,
} from "../../../../../../lib/server/applicationOperationsService";

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

interface RequestBody {
  recruiterId?: unknown;
  note?: unknown;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof ApplicationOperationsServiceError
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
    "PATCH application assignee failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "담당자 변경 중 서버 오류가 발생했습니다.",
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
      await requireFirebaseUser(
        request
      );

    const {
      applicationId,
    } = await context.params;

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
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

    const recruiterId =
      typeof body.recruiterId ===
      "string"
        ? body.recruiterId
        : "";

    const note =
      typeof body.note ===
      "string"
        ? body.note
        : undefined;

    const result =
      await assignApplicationRecruiter(
        authenticatedUser.uid,
        applicationId,
        recruiterId,
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
