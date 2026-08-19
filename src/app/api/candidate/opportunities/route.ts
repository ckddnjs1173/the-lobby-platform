import { NextResponse } from "next/server";

import {
  CandidatePortalServiceError,
} from "../../../../lib/server/candidatePortalService";
import {
  TalentOpportunityServiceError,
  listCandidateTalentOpportunities,
} from "../../../../lib/server/talentOpportunityService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

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

  console.error("Candidate talent opportunities API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "채용 제안 조회 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const result = await listCandidateTalentOpportunities(user.uid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
