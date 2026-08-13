import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../lib/server/b2bAuthorization";

import {
  B2BDirectApplicationServiceError,
  createB2BDirectApplication,
} from "../../../../lib/server/b2bDirectApplicationService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface CreateDirectApplicationBody {
  candidateId?: unknown;
  jobId?: unknown;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (error instanceof ServerAuthError) {
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

  if (
    error instanceof B2BAuthorizationError
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

  if (
    error instanceof
    B2BDirectApplicationServiceError
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
    "POST /api/b2b/applications failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "B2B 직접 지원 생성 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);

    let body: CreateDirectApplicationBody;

    try {
      body =
        (await request.json()) as CreateDirectApplicationBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "요청 데이터 형식이 올바르지 않습니다.",
          code: "INVALID_JSON_BODY",
        },
        {
          status: 400,
        }
      );
    }

    const candidateId =
      typeof body.candidateId === "string"
        ? body.candidateId
        : "";

    const jobId =
      typeof body.jobId === "string"
        ? body.jobId
        : "";

    const result =
      await createB2BDirectApplication(
        authenticatedUser.uid,
        candidateId,
        jobId
      );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
