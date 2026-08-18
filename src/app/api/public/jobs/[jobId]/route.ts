import { NextResponse } from "next/server";

import { getPublicJob } from "../../../../../lib/server/publicJobService";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { jobId } = await context.params;
    const job = await getPublicJob(jobId || "");

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "현재 확인할 수 없는 공고입니다.",
          code: "PUBLIC_JOB_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Public job detail API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "채용 공고를 불러오지 못했습니다.",
        code: "PUBLIC_JOB_FAILED",
      },
      { status: 500 }
    );
  }
}
