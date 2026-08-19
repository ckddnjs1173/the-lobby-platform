import { NextResponse } from "next/server";

import {
  CandidatePortalServiceError,
} from "../../../../lib/server/candidatePortalService";
import {
  CandidateSavedJobServiceError,
  listCandidateSavedJobs,
  saveCandidateJob,
} from "../../../../lib/server/candidateSavedJobService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

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

  console.error("Candidate saved-jobs API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "저장공고 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const result = await listCandidateSavedJobs(user.uid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
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

    const jobId =
      typeof body === "object" && body !== null && "jobId" in body
        ? (body as { jobId?: unknown }).jobId
        : undefined;
    const result = await saveCandidateJob(user.uid, jobId);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
