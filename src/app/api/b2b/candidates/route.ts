import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../lib/server/b2bAuthorization";

import {
  CandidateServiceError,
  createB2BPassiveCandidate,
} from "../../../../lib/server/candidateService";

import {
  CandidatePoolServiceError,
  listB2BCandidatePool,
  searchB2BCandidatePool,
} from "../../../../lib/server/candidatePoolService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime =
  "nodejs";

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof CandidateServiceError ||
    error instanceof CandidatePoolServiceError
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
    "B2B candidates API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "후보자 요청 처리 중 서버 오류가 발생했습니다.",
      code:
        "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    const requestUrl =
      new URL(request.url);

    const organizationId =
      requestUrl.searchParams.get(
        "organizationId"
      ) || undefined;

    const query =
      requestUrl.searchParams.get(
        "query"
      ) || undefined;

    const cursor =
      requestUrl.searchParams.get(
        "cursor"
      ) || undefined;

    const limit =
      requestUrl.searchParams.get(
        "limit"
      ) || undefined;

    const result = query?.trim()
      ? await searchB2BCandidatePool(
          authenticatedUser.uid,
          query,
          organizationId
        )
      : await listB2BCandidatePool(
          authenticatedUser.uid,
          {
            organizationId,
            cursor,
            limit,
          }
        );

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "요청 데이터 형식이 올바르지 않습니다.",
          code:
            "INVALID_JSON_BODY",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await createB2BPassiveCandidate(
        authenticatedUser.uid,
        body
      );

    return NextResponse.json(
      {
        success: true,
        data:
          result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(
      error
    );
  }
}
