import { NextResponse } from "next/server";

import {
  getFirebaseAdminDb,
} from "../../../../../../lib/server/firebaseAdmin";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../../../lib/server/serverAuth";

export const runtime = "nodejs";

// ============================================================================
// Types
// ============================================================================

type B2BRole =
  | "ADMIN"
  | "RECRUITER";

interface RouteContext {
  params: Promise<{
    applicationId: string;
  }>;
}

// ============================================================================
// Error
// ============================================================================

class CandidateProfileAccessError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 403,
    code = "CANDIDATE_PROFILE_ACCESS_DENIED"
  ) {
    super(message);

    this.name =
      "CandidateProfileAccessError";

    this.status =
      status;

    this.code =
      code;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function normalizeString(
  value: unknown
): string {
  return isNonEmptyString(value)
    ? value.trim()
    : "";
}

function normalizeOptionalString(
  value: unknown
): string | null {
  return isNonEmptyString(value)
    ? value.trim()
    : null;
}

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function normalizeObjectArray(
  value: unknown
): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is Record<
      string,
      unknown
    > =>
      typeof item ===
        "object" &&
      item !== null &&
      !Array.isArray(item)
  );
}

function normalizeProfileCompleteness(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(value)
    )
  );
}

function timestampToIsoString(
  value: unknown
): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const timestampLike =
      value as {
        toDate?: () => Date;
      };

    if (
      typeof timestampLike.toDate ===
      "function"
    ) {
      try {
        return timestampLike
          .toDate()
          .toISOString();
      } catch {
        return null;
      }
    }
  }

  return null;
}

// ============================================================================
// Authorization
// ============================================================================

interface B2BActor {
  uid: string;

  role: B2BRole;

  organizationId:
    | string
    | null;
}

async function getB2BActor(
  uid: string
): Promise<B2BActor> {
  const db =
    getFirebaseAdminDb();

  const userSnapshot =
    await db
      .collection("users")
      .doc(uid)
      .get();

  if (
    !userSnapshot.exists
  ) {
    throw new CandidateProfileAccessError(
      "관리자 권한 정보를 찾을 수 없습니다.",
      403,
      "B2B_USER_NOT_FOUND"
    );
  }

  const userData =
    userSnapshot.data();

  if (!userData) {
    throw new CandidateProfileAccessError(
      "관리자 권한 정보가 비어 있습니다.",
      403,
      "B2B_USER_DATA_MISSING"
    );
  }

  const role =
    userData.role;

  if (
    role !== "ADMIN" &&
    role !== "RECRUITER"
  ) {
    throw new CandidateProfileAccessError(
      "헤드헌터 워크스페이스 접근 권한이 없습니다.",
      403,
      "B2B_ROLE_REQUIRED"
    );
  }

  if (
    userData.status !==
    "ACTIVE"
  ) {
    throw new CandidateProfileAccessError(
      "현재 사용할 수 없는 관리자 계정입니다.",
      403,
      "B2B_USER_INACTIVE"
    );
  }

  const normalizedRole =
    role as B2BRole;

  const organizationId =
    isNonEmptyString(
      userData.organizationId
    )
      ? userData.organizationId.trim()
      : null;

  if (
    normalizedRole ===
      "RECRUITER" &&
    !organizationId
  ) {
    throw new CandidateProfileAccessError(
      "리쿠르터의 조직 정보가 설정되지 않았습니다.",
      403,
      "RECRUITER_ORGANIZATION_MISSING"
    );
  }

  return {
    uid,

    role:
      normalizedRole,

    organizationId,
  };
}

// ============================================================================
// Error Response
// ============================================================================

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
    CandidateProfileAccessError
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
    "GET candidate profile failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,

      error:
        "지원자 프로필 조회 중 서버 오류가 발생했습니다.",

      code:
        "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

// ============================================================================
// Route
// ============================================================================

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    // ------------------------------------------------------------------------
    // 1. Firebase Authentication
    // ------------------------------------------------------------------------

    const authenticatedUser =
      await requireFirebaseUser(
        request
      );

    // ------------------------------------------------------------------------
    // 2. B2B Authorization
    // ------------------------------------------------------------------------

    const actor =
      await getB2BActor(
        authenticatedUser.uid
      );

    // ------------------------------------------------------------------------
    // 3. Application ID
    // ------------------------------------------------------------------------

    const {
      applicationId,
    } = await context.params;

    const normalizedApplicationId =
      applicationId?.trim();

    if (
      !normalizedApplicationId
    ) {
      throw new CandidateProfileAccessError(
        "지원 ID가 필요합니다.",
        400,
        "APPLICATION_ID_REQUIRED"
      );
    }

    const db =
      getFirebaseAdminDb();

    // ------------------------------------------------------------------------
    // 4. Application 조회
    // ------------------------------------------------------------------------

    const applicationSnapshot =
      await db
        .collection(
          "applications"
        )
        .doc(
          normalizedApplicationId
        )
        .get();

    if (
      !applicationSnapshot.exists
    ) {
      throw new CandidateProfileAccessError(
        "존재하지 않는 지원 내역입니다.",
        404,
        "APPLICATION_NOT_FOUND"
      );
    }

    const applicationData =
      applicationSnapshot.data();

    if (
      !applicationData
    ) {
      throw new CandidateProfileAccessError(
        "지원 내역 데이터가 비어 있습니다.",
        409,
        "APPLICATION_DATA_MISSING"
      );
    }

    // ------------------------------------------------------------------------
    // 5. Tenant Authorization
    // ------------------------------------------------------------------------

    const applicationOrganizationId =
      normalizeString(
        applicationData.organizationId
      );

    if (
      !applicationOrganizationId
    ) {
      throw new CandidateProfileAccessError(
        "지원 내역의 조직 정보가 없습니다.",
        409,
        "APPLICATION_ORGANIZATION_MISSING"
      );
    }

    if (
      actor.role ===
        "RECRUITER" &&
      actor.organizationId !==
        applicationOrganizationId
    ) {
      throw new CandidateProfileAccessError(
        "다른 조직의 지원자 프로필에는 접근할 수 없습니다.",
        403,
        "TENANT_ACCESS_DENIED"
      );
    }

    // ------------------------------------------------------------------------
    // 6. Candidate ID는 Application에서 서버가 획득
    // ------------------------------------------------------------------------

    const candidateId =
      normalizeString(
        applicationData.candidateId
      );

    if (!candidateId) {
      throw new CandidateProfileAccessError(
        "지원 내역의 Candidate 정보가 없습니다.",
        409,
        "APPLICATION_CANDIDATE_MISSING"
      );
    }

    // ------------------------------------------------------------------------
    // 7. Candidate 존재 확인
    // ------------------------------------------------------------------------

    const candidateSnapshot =
      await db
        .collection(
          "candidates"
        )
        .doc(candidateId)
        .get();

    if (
      !candidateSnapshot.exists
    ) {
      throw new CandidateProfileAccessError(
        "지원자 정보를 찾을 수 없습니다.",
        404,
        "CANDIDATE_NOT_FOUND"
      );
    }

    // ------------------------------------------------------------------------
    // 8. Profile 조회
    // ------------------------------------------------------------------------

    const profileSnapshot =
      await db
        .collection(
          "profile"
        )
        .doc(candidateId)
        .get();

    if (
      !profileSnapshot.exists
    ) {
      return NextResponse.json({
        success: true,

        data: null,
      });
    }

    const profileData =
      profileSnapshot.data();

    if (!profileData) {
      return NextResponse.json({
        success: true,

        data: null,
      });
    }

    // ------------------------------------------------------------------------
    // 9. 허용된 Profile 필드만 반환
    // ------------------------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: {
        candidateId,

        headline:
          normalizeString(
            profileData.headline
          ),

        careerSummary:
          normalizeString(
            profileData.careerSummary
          ),

        skills:
          normalizeStringArray(
            profileData.skills
          ),

        careers:
          normalizeObjectArray(
            profileData.careers
          ),

        education:
          normalizeObjectArray(
            profileData.education
          ),

        certifications:
          normalizeObjectArray(
            profileData.certifications
          ),

        languages:
          normalizeObjectArray(
            profileData.languages
          ),

        desiredJob:
          normalizeOptionalString(
            profileData.desiredJob
          ),

        desiredLocation:
          normalizeOptionalString(
            profileData.desiredLocation
          ),

        desiredSalary:
          normalizeOptionalString(
            profileData.desiredSalary
          ),

        profileCompleteness:
          normalizeProfileCompleteness(
            profileData.profileCompleteness
          ),

        updatedAt:
          timestampToIsoString(
            profileData.updatedAt
          ),
      },
    });
  } catch (error) {
    return errorResponse(
      error
    );
  }
}