import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../lib/server/b2bAuthorization";

import {
  ApplicationPageServiceError,
  listB2BApplicationPage,
} from "../../../../../lib/server/applicationPageService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof ApplicationPageServiceError
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
    "B2B application page API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원 목록 페이지를 불러오는 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

function parsePageSize(
  value: string | null
): number | undefined {
  if (value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new ApplicationPageServiceError(
      "페이지 크기 형식이 올바르지 않습니다.",
      400,
      "APPLICATION_PAGE_SIZE_INVALID"
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

    const page = await listB2BApplicationPage(
      authenticatedUser.uid,
      {
        pageSize: parsePageSize(
          url.searchParams.get("limit")
        ),
        cursor:
          url.searchParams.get("cursor"),
      }
    );

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
