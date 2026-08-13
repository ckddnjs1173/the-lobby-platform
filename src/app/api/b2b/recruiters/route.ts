import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../lib/server/b2bAuthorization";

import {
  ApplicationOperationsServiceError,
  listAssignableRecruiters,
} from "../../../../lib/server/applicationOperationsService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

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
    "GET /api/b2b/recruiters failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "담당자 목록을 불러오는 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    const url = new URL(
      request.url
    );

    const organizationId =
      url.searchParams.get(
        "organizationId"
      ) || undefined;

    const recruiters =
      await listAssignableRecruiters(
        authenticatedUser.uid,
        organizationId
      );

    return NextResponse.json({
      success: true,
      data: recruiters,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
