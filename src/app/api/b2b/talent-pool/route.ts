import { NextResponse } from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../lib/server/b2bAuthorization";
import {
  GlobalTalentPoolServiceError,
  listGlobalTalentPool,
  searchGlobalTalentPool,
} from "../../../../lib/server/globalTalentPoolService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof GlobalTalentPoolServiceError
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

  console.error("Global talent-pool API failed:", error);
  return NextResponse.json(
    {
      success: false,
      error: "공개 인재풀 조회 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("query") || undefined;
    const cursor = url.searchParams.get("cursor") || undefined;
    const limit = url.searchParams.get("limit") || undefined;

    const result = query?.trim()
      ? await searchGlobalTalentPool(user.uid, query)
      : await listGlobalTalentPool(user.uid, { cursor, limit });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
