import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../../lib/server/b2bAuthorization";

import {
  CandidatePlacementServiceError,
  listB2BCandidatePlacements,
} from "../../../../../../../lib/server/candidatePlacementService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    candidateId: string;
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

  if (error instanceof B2BAuthorizationError) {
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
    CandidatePlacementServiceError
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
    "GET candidate placements failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "후보자의 지원 이력을 불러오는 중 서버 오류가 발생했습니다.",
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
      await requireFirebaseUser(request);

    const {
      candidateId,
    } = await context.params;

    const result =
      await listB2BCandidatePlacements(
        authenticatedUser.uid,
        candidateId || ""
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
