import {
  NextResponse,
} from "next/server";

import {
  B2BAuthorizationError,
} from "../../../../../../../lib/server/b2bAuthorization";

import {
  ApplicationCommunicationTemplateServiceError,
  listApplicationCommunicationTemplates,
} from "../../../../../../../lib/server/applicationCommunicationTemplateService";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    applicationId: string;
  }>;
}

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof B2BAuthorizationError ||
    error instanceof ApplicationCommunicationTemplateServiceError
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
    "Application communication template API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원자 커뮤니케이션 초안을 불러오는 중 서버 오류가 발생했습니다.",
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

    const templates =
      await listApplicationCommunicationTemplates(
        authenticatedUser.uid,
        applicationId || ""
      );

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
