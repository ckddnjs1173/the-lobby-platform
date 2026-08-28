import { NextResponse } from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../lib/server/b2bAuthorization";
import {
  JobOperationalDetailsServiceError,
  getJobOperationalDetails,
  updateJobOperationalDetails,
} from "../../../../../../lib/server/jobOperationalDetailsService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof JobOperationalDetailsServiceError
  ) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("B2B job details API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "공고 상세조건 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireFirebaseUser(request);
    const { jobId } = await context.params;
    const result = await getJobOperationalDetails(user.uid, jobId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireFirebaseUser(request);
    const { jobId } = await context.params;
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "요청 데이터 형식이 올바르지 않습니다.",
          code: "INVALID_JSON_BODY",
        },
        { status: 400 }
      );
    }

    const result = await updateJobOperationalDetails(user.uid, jobId, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
