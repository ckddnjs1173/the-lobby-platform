import { NextResponse } from "next/server";

import {
  AcquisitionAnalyticsServiceError,
  getAcquisitionAnalytics,
} from "../../../../lib/server/acquisitionAnalyticsService";
import { B2BAuthorizationError } from "../../../../lib/server/b2bAuthorization";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof AcquisitionAnalyticsServiceError
  ) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("Acquisition analytics API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "공개 유입 분석 조회 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const result = await getAcquisitionAnalytics(user.uid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
