import { NextResponse } from "next/server";

import {
  CANDIDATE_CONSENT_VERSION,
} from "../../../../lib/server/candidatePreferenceService";
import {
  REGISTRATION_CONSENT_COOKIE,
} from "../../../../lib/server/candidateRegistrationConsentService";
import {
  consumeRateLimit,
  createRateLimitHeaders,
  getRequestClientKey,
} from "../../../../lib/server/requestRateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(
    `registration-consent:${getRequestClientKey(request)}`,
    { limit: 20, windowMs: 60_000 }
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "요청 데이터 형식이 올바르지 않습니다.",
        code: "INVALID_JSON_BODY",
      },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const record =
    typeof body === "object" && body !== null
      ? body as Record<string, unknown>
      : {};

  if (
    record.privacyConsent !== true ||
    record.termsConsent !== true
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "필수 개인정보 수집·이용 및 이용약관 동의가 필요합니다.",
        code: "REQUIRED_CONSENT_MISSING",
      },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const response = NextResponse.json(
    {
      success: true,
      data: { consentVersion: CANDIDATE_CONSENT_VERSION },
    },
    { status: 201, headers: createRateLimitHeaders(rateLimit) }
  );

  response.cookies.set({
    name: REGISTRATION_CONSENT_COOKIE,
    value: CANDIDATE_CONSENT_VERSION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}
