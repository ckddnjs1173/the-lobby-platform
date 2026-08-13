import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "./firebaseAdmin";

export class ServerAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 401,
    code = "UNAUTHORIZED"
  ) {
    super(message);

    this.name = "ServerAuthError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Authorization: Bearer <Firebase ID Token>
 *
 * 형식의 토큰을 추출한다.
 */
function getBearerToken(
  request: Request
): string {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    throw new ServerAuthError(
      "인증 토큰이 없습니다.",
      401,
      "AUTH_TOKEN_MISSING"
    );
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    throw new ServerAuthError(
      "올바르지 않은 인증 방식입니다.",
      401,
      "INVALID_AUTH_HEADER"
    );
  }

  return token;
}

/**
 * 클라이언트가 보내온 Firebase ID Token을
 * Firebase Admin SDK에서 직접 검증한다.
 *
 * 여기서 반환되는 uid만 서버에서 신뢰한다.
 *
 * candidateId, changedBy UID 등을
 * 클라이언트 요청 Body에서 신뢰하지 않는다.
 */
export async function requireFirebaseUser(
  request: Request
): Promise<DecodedIdToken> {
  const idToken = getBearerToken(request);

  try {
    const decodedToken =
      await getFirebaseAdminAuth().verifyIdToken(
        idToken
      );

    if (!decodedToken.uid) {
      throw new ServerAuthError(
        "인증 사용자 UID를 확인할 수 없습니다.",
        401,
        "AUTH_UID_MISSING"
      );
    }

    return decodedToken;
  } catch (error) {
    if (error instanceof ServerAuthError) {
      throw error;
    }

    console.error(
      "Firebase ID Token verification failed:",
      error
    );

    throw new ServerAuthError(
      "로그인 정보가 유효하지 않습니다.",
      401,
      "INVALID_ID_TOKEN"
    );
  }
}