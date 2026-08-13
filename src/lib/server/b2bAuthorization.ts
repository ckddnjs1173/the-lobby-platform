import type {
  UserRole,
} from "../../types";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

// ============================================================================
// Error
// ============================================================================

export class B2BAuthorizationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 403,
    code = "B2B_ACCESS_DENIED"
  ) {
    super(message);

    this.name =
      "B2BAuthorizationError";

    this.status =
      status;

    this.code =
      code;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface B2BActor {
  uid: string;

  role:
    | "ADMIN"
    | "RECRUITER";

  organizationId:
    | string
    | null;

  name:
    | string
    | null;

  email:
    | string
    | null;
}

// ============================================================================
// Constants
// ============================================================================

const B2B_ROLES:
  readonly UserRole[] = [
    "ADMIN",
    "RECRUITER",
  ];

// ============================================================================
// Helpers
// ============================================================================

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

// ============================================================================
// Authorization
// ============================================================================

/**
 * Firestore users/{uid}를 기준으로
 * B2B 관리자 권한을 검증한다.
 *
 * 보안 원칙:
 * - Firebase 인증 성공만으로 B2B 권한을 부여하지 않는다.
 * - role은 ADMIN 또는 RECRUITER여야 한다.
 * - status는 반드시 명시적으로 ACTIVE여야 한다.
 * - RECRUITER는 organizationId가 반드시 존재해야 한다.
 */
export async function requireB2BActor(
  uid: string
): Promise<B2BActor> {
  if (
    !isNonEmptyString(
      uid
    )
  ) {
    throw new B2BAuthorizationError(
      "인증 사용자 UID를 확인할 수 없습니다.",
      401,
      "AUTH_UID_MISSING"
    );
  }

  const db =
    getFirebaseAdminDb();

  const userSnapshot =
    await db
      .collection(
        "users"
      )
      .doc(
        uid.trim()
      )
      .get();

  if (
    !userSnapshot.exists
  ) {
    throw new B2BAuthorizationError(
      "The Lobby 관리자 계정으로 등록되지 않은 사용자입니다.",
      403,
      "B2B_USER_NOT_FOUND"
    );
  }

  const userData =
    userSnapshot.data();

  if (
    !userData
  ) {
    throw new B2BAuthorizationError(
      "관리자 권한 정보를 확인할 수 없습니다.",
      403,
      "B2B_USER_DATA_MISSING"
    );
  }

  const role =
    userData.role;

  if (
    !B2B_ROLES.includes(
      role as UserRole
    )
  ) {
    throw new B2BAuthorizationError(
      "헤드헌터 워크스페이스 접근 권한이 없습니다.",
      403,
      "B2B_ROLE_REQUIRED"
    );
  }

  /**
   * status가 누락된 경우도 허용하지 않는다.
   */
  if (
    userData.status !==
    "ACTIVE"
  ) {
    throw new B2BAuthorizationError(
      "현재 사용할 수 없는 관리자 계정입니다.",
      403,
      "B2B_USER_INACTIVE"
    );
  }

  const normalizedRole =
    role as
      | "ADMIN"
      | "RECRUITER";

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
    throw new B2BAuthorizationError(
      "리쿠르터의 조직 정보가 설정되지 않았습니다.",
      403,
      "RECRUITER_ORGANIZATION_MISSING"
    );
  }

  const name =
    isNonEmptyString(
      userData.name
    )
      ? userData.name.trim()
      : null;

  const email =
    isNonEmptyString(
      userData.email
    )
      ? userData.email
          .trim()
          .toLowerCase()
      : null;

  return {
    uid:
      uid.trim(),

    role:
      normalizedRole,

    organizationId,

    name,

    email,
  };
}
