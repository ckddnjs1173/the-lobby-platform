import { NextResponse } from "next/server";

import { B2BAuthorizationError } from "../../../../lib/server/b2bAuthorization";
import {
  TalentOpportunityServiceError,
  createTalentOpportunity,
} from "../../../../lib/server/talentOpportunityService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof TalentOpportunityServiceError
  ) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("Talent opportunity admin API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "채용 제안 생성 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "요청 데이터 형식이 올바르지 않습니다.", code: "INVALID_JSON_BODY" },
        { status: 400 }
      );
    }

    const result = await createTalentOpportunity(user.uid, body);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
