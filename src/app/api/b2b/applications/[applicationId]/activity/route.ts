import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../lib/server/b2bAuthorization";

import {
  ApplicationActivityServiceError,
  addApplicationNote,
  listApplicationActivity,
} from "../../../../../../lib/server/applicationActivityService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    applicationId: string;
  }>;
}

interface AddNoteRequestBody {
  note?: unknown;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof ApplicationActivityServiceError
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
    "Application activity API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원 활동 내역 처리 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);

    const {
      applicationId,
    } = await context.params;

    const result =
      await listApplicationActivity(
        authenticatedUser.uid,
        applicationId || ""
      );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);

    const {
      applicationId,
    } = await context.params;

    let body: AddNoteRequestBody;

    try {
      body =
        (await request.json()) as AddNoteRequestBody;
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

    const result =
      await addApplicationNote(
        authenticatedUser.uid,
        applicationId || "",
        body.note
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
