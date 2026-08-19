import { NextResponse } from "next/server";

import {
  CandidatePortalServiceError,
} from "../../../../../lib/server/candidatePortalService";
import {
  CandidateSavedJobServiceError,
  removeCandidateSavedJob,
} from "../../../../../lib/server/candidateSavedJobService";
import { recordPublicEvent } from "../../../../../lib/server/publicEventService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof CandidatePortalServiceError ||
    error instanceof CandidateSavedJobServiceError
  ) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error("Candidate saved-job delete failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "저장공고 삭제 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireFirebaseUser(request);
    const { jobId } = await context.params;
    const result = await removeCandidateSavedJob(user.uid, jobId);
    void recordPublicEvent(
      "saved_job_removed",
      `/jobs/${encodeURIComponent(result.jobId)}`
    ).catch((error) => console.error("Saved-job removal event failed:", error));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
