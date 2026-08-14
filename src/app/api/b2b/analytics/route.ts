import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../lib/server/b2bAuthorization";

import {
  RecruitingAnalyticsServiceError,
  getRecruitingAnalytics,
} from "../../../../lib/server/recruitingAnalyticsService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof RecruitingAnalyticsServiceError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      {
        status: error.status,
      }
    );
  }

  console.error(
    "B2B recruiting analytics API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "채용 분석 데이터를 불러오는 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

function parseDays(
  value: string | null
): number | undefined {
  if (value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new RecruitingAnalyticsServiceError(
      "분석 기간 형식이 올바르지 않습니다.",
      400,
      "ANALYTICS_DAYS_INVALID"
    );
  }

  return parsed;
}

export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);
    const url = new URL(request.url);
    const days = parseDays(
      url.searchParams.get("days")
    );
    const organizationId =
      url.searchParams.get("organizationId");

    const analytics =
      await getRecruitingAnalytics(
        authenticatedUser.uid,
        {
          days,
          organizationId,
        }
      );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
