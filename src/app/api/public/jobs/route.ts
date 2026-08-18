import { NextResponse } from "next/server";

import { listPublicJobs } from "../../../../lib/server/publicJobService";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: await listPublicJobs(),
    });
  } catch (error) {
    console.error("Public jobs API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "채용 공고를 불러오지 못했습니다.",
        code: "PUBLIC_JOBS_FAILED",
      },
      { status: 500 }
    );
  }
}
