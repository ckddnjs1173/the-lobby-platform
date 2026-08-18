import { NextResponse } from "next/server";

import { B2BAuthorizationError } from "../../../../lib/server/b2bAuthorization";
import { listB2BOrganizations } from "../../../../lib/server/organizationService";
import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authenticatedUser = await requireFirebaseUser(request);
    const organizations = await listB2BOrganizations(authenticatedUser.uid);

    return NextResponse.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    if (
      error instanceof ServerAuthError ||
      error instanceof B2BAuthorizationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.status }
      );
    }

    console.error("B2B organizations API failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "조직 목록을 불러오지 못했습니다.",
        code: "B2B_ORGANIZATIONS_FAILED",
      },
      { status: 500 }
    );
  }
}
