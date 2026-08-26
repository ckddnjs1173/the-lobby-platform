import { NextResponse } from "next/server";

import {
  CandidatePortalServiceError,
} from "../../../../lib/server/candidatePortalService";
import {
  CandidatePreferenceServiceError,
  getCandidatePreferences,
  updateCandidatePreferences,
} from "../../../../lib/server/candidatePreferenceService";
import { recordPublicEvent } from "../../../../lib/server/publicEventService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof CandidatePortalServiceError ||
    error instanceof CandidatePreferenceServiceError
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

  console.error("Candidate preferences API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "인재풀 설정 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const result = await getCandidatePreferences(user.uid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
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

    const previous = await getCandidatePreferences(user.uid);
    const result = await updateCandidatePreferences(user.uid, body);

    void recordPublicEvent(
      "talent_pool_settings_saved",
      "/talent-pool/settings"
    ).catch((error) =>
      console.error("Talent-pool settings event failed:", error)
    );

    if (previous.talentPoolOptIn !== result.talentPoolOptIn) {
      const transitionEvent = result.talentPoolOptIn
        ? "talent_pool_opted_in"
        : "talent_pool_opted_out";
      void recordPublicEvent(
        transitionEvent,
        "/talent-pool/settings"
      ).catch((error) =>
        console.error("Talent-pool visibility transition event failed:", error)
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
