import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../lib/server/b2bAuthorization";

import {
  CandidateCrmServiceError,
  getB2BCandidateDetail,
  updateB2BCandidateProfile,
} from "../../../../../lib/server/candidateCrmService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../lib/server/serverAuth";

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

  if (error instanceof CandidateCrmServiceError) {
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
    "Candidate CRM route failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "후보자 정보를 처리하는 중 서버 오류가 발생했습니다.",
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

    const candidate = await getB2BCandidateDetail(
      authenticatedUser.uid,
      candidateId
    );

    return NextResponse.json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);
    const {
      candidateId,
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

    const result = await updateB2BCandidateProfile(
      authenticatedUser.uid,
      candidateId,
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
