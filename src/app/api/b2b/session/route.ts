import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
  requireB2BActor,
} from "../../../../lib/server/b2bAuthorization";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime =
  "nodejs";

// ============================================================================
// Error Response
// ============================================================================

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof
    ServerAuthError
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

  if (
    error instanceof
    B2BAuthorizationError
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
    "GET /api/b2b/session failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "관리자 권한 확인 중 서버 오류가 발생했습니다.",
      code:
        "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

// ============================================================================
// GET
// ============================================================================

export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    const actor =
      await requireB2BActor(
        authenticatedUser.uid
      );

    const name =
      actor.name ||
      authenticatedUser.email ||
      "관리자";

    const email =
      actor.email ||
      authenticatedUser.email ||
      "";

    return NextResponse.json({
      success: true,

      data: {
        uid:
          actor.uid,

        name,

        email,

        role:
          actor.role,

        organizationId:
          actor.organizationId,

        status:
          "ACTIVE",
      },
    });
  } catch (error) {
    return errorResponse(
      error
    );
  }
}
