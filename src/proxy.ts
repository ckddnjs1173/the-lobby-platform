import { NextResponse, type NextRequest } from "next/server";

const CONSENT_COOKIE = "the_lobby_registration_consent";
const CONSENT_VERSION = "2026-08-19";

export function proxy(request: NextRequest) {
  const consent = request.cookies.get(CONSENT_COOKIE)?.value;
  if (consent === CONSENT_VERSION) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/register/consent", request.url));
}

export const config = {
  matcher: ["/register"],
};
