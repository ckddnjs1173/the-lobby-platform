import {
  NextResponse,
} from "next/server";

import {
  CandidatePortalServiceError,
  bootstrapCandidatePortalProfile,
  getCandidatePortalProfile,
  updateCandidatePortalProfile,
} from "../../../../lib/server/candidatePortalService";

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
    error instanceof CandidatePortalServiceError
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
    "Candidate portal profile API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "Candidate 프로필 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

async function readJsonBody(
  request: Request
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new CandidatePortalServiceError(
      "요청 데이터 형식이 올바르지 않습니다.",
      400,
      "INVALID_JSON_BODY"
    );
  }
}

export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);
    const profile =
      await getCandidatePortalProfile(
        authenticatedUser.uid
      );

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);
    const body =
      await readJsonBody(request);
    const result =
      await bootstrapCandidatePortalProfile(
        authenticatedUser.uid,
        authenticatedUser.email,
        body
      );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status:
          result.created
            ? 201
            : 200,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);
    const body =
      await readJsonBody(request);
    const profile =
      await updateCandidatePortalProfile(
        authenticatedUser.uid,
        body
      );

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
