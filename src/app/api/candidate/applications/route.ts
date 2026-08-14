import {
  NextResponse,
} from "next/server";

import {
  CandidatePortalServiceError,
  listCandidatePortalApplications,
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
    "Candidate application history API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원 내역을 불러오는 중 서버 오류가 발생했습니다.",
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
      await requireFirebaseUser(request);
    const applications =
      await listCandidatePortalApplications(
        authenticatedUser.uid
      );

    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
