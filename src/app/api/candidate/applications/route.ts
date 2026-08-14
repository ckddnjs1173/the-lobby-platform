import {
  NextResponse,
} from "next/server";

import {
  CandidatePortalServiceError,
  listCandidatePortalApplications,
} from "../../../../lib/server/candidatePortalService";

import {
  getFirebaseAdminDb,
} from "../../../../lib/server/firebaseAdmin";

import {
  ServerAuthError,
  requireFirebaseUser,
} from "../../../../lib/server/serverAuth";

export const runtime = "nodejs";

function errorResponse(
  error: unknown
): NextResponse {
  if (
    error instanceof ServerAuthError ||
    error instanceof CandidatePortalServiceError
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
    "Candidate application history API failed:",
    error
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "지원 내역을 불러오는 중 서버 오류가 발생했습니다.",
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
    }
  );
}

async function enforcePublicCompanyNames<
  T extends {
    jobId: string;
    company: string;
  },
>(applications: T[]): Promise<T[]> {
  if (applications.length === 0) {
    return applications;
  }

  const db = getFirebaseAdminDb();
  const jobIds = Array.from(
    new Set(
      applications
        .map((application) =>
          application.jobId.trim()
        )
        .filter(Boolean)
    )
  );

  const jobSnapshots = await Promise.all(
    jobIds.map((jobId) =>
      db.collection("jobs").doc(jobId).get()
    )
  );

  const publicCompanyByJobId = new Map(
    jobSnapshots.map((snapshot) => {
      const displayCompany =
        snapshot.data()?.displayCompany;

      return [
        snapshot.id,
        typeof displayCompany === "string" &&
        displayCompany.trim()
          ? displayCompany.trim()
          : "채용 고객사",
      ] as const;
    })
  );

  return applications.map((application) => ({
    ...application,
    company:
      publicCompanyByJobId.get(
        application.jobId
      ) || "채용 고객사",
  }));
}

export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await requireFirebaseUser(request);
    const applications =
      await listCandidatePortalApplications(
        authenticatedUser.uid
      );
    const publicApplications =
      await enforcePublicCompanyNames(
        applications
      );

    return NextResponse.json({
      success: true,
      data: publicApplications,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
