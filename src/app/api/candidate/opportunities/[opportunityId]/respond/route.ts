import { NextResponse } from "next/server";

import {
  CandidatePortalServiceError,
} from "../../../../../../lib/server/candidatePortalService";
import {
  TalentOpportunityServiceError,
  respondToTalentOpportunity,
} from "../../../../../../lib/server/talentOpportunityService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof CandidatePortalServiceError ||
    error instanceof TalentOpportunityServiceError
  ) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("Candidate opportunity response API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "채용 제안 응답 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> }
) {
  try {
    const user = await requireFirebaseUser(request);
    const { opportunityId } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "요청 데이터 형식이 올바르지 않습니다.", code: "INVALID_JSON_BODY" },
        { status: 400 }
      );
    }

    const decision =
      typeof body === "object" && body !== null && "decision" in body
        ? (body as { decision?: unknown }).decision
        : undefined;
    const result = await respondToTalentOpportunity(
      user.uid,
      opportunityId,
      decision
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
