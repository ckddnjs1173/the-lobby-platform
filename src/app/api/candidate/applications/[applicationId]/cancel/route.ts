import { NextResponse } from "next/server";

import {
  CandidateApplicationActionError,
  cancelCandidateApplication,
} from "../../../../../../lib/server/candidateApplicationActionService";
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

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticatedUser = await requireFirebaseUser(request);
    const { applicationId } = await context.params;
    const result = await cancelCandidateApplication(
      authenticatedUser.uid,
      applicationId || ""
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (
      error instanceof ServerAuthError ||
      error instanceof CandidateApplicationActionError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.status }
      );
    }

    console.error("Candidate application cancel failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "지원 취소 중 서버 오류가 발생했습니다.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
