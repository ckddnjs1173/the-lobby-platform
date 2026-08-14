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
} from "../../../../lib/server/candidatePoolService";

import {
  getFirebaseAdminDb,
} from "../../../../lib/server/firebaseAdmin";

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
    error instanceof
    ServerAuthError
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
        code:
          error.code,
      },
      {
        status:
          error.status,
      }
    );
  }

  if (
    error instanceof
    B2BAuthorizationError
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
        code:
          error.code,
      },
      {
        status:
          error.status,
      }
    );
  }

  if (
    error instanceof
    CandidateServiceError ||
    error instanceof
    CandidatePoolServiceError
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
        code:
          error.code,
      },
      {
        status:
          error.status,
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

    const candidates =
      await listB2BCandidatePool(
        authenticatedUser.uid,
        organizationId
      );

    return NextResponse.json({
      success: true,
      data: candidates,
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

    /**
     * Passive Candidate는 Client SDK에서 직접 조회되지 않지만,
     * 이후 B2B_DIRECT Application 생성 시 tenant 경계를 검증할 수 있도록
     * 서버 소유 provenance를 Candidate 문서에 남긴다.
     *
     * B2C Firestore Rules의 exact schema에는 이 필드가 포함되지 않으므로
     * Client가 동일 필드를 주입하는 것은 계속 차단된다.
     */
    const db = getFirebaseAdminDb();

    await db
      .collection("candidates")
      .doc(result.candidateId)
      .update({
        organizationId:
          result.actorOrganizationId,
        createdBy:
          result.createdBy,
      });

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
