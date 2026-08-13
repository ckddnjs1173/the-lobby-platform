import type {
  DocumentData,
} from "firebase-admin/firestore";

import {
  requireB2BActor,
  type B2BActor,
} from "./b2bAuthorization";

import {
  getFirebaseAdminDb,
} from "./firebaseAdmin";

export class CandidatePoolServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "CANDIDATE_POOL_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "CandidatePoolServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CandidatePoolItem {
  candidateId: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  source: "B2B_DIRECT";
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdBy: string;
  headline: string;
  skills: string[];
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function timestampToIsoString(
  value: unknown
): string | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const timestamp = value as {
    toDate?: () => Date;
  };

  if (typeof timestamp.toDate !== "function") {
    return null;
  }

  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function resolveOrganizationId(
  actor: B2BActor,
  organizationIdInput?: string
): string {
  if (actor.role === "RECRUITER") {
    if (!actor.organizationId) {
      throw new CandidatePoolServiceError(
        "리쿠르터 조직 정보를 확인할 수 없습니다.",
        403,
        "RECRUITER_ORGANIZATION_MISSING"
      );
    }

    if (
      organizationIdInput?.trim() &&
      organizationIdInput.trim() !== actor.organizationId
    ) {
      throw new CandidatePoolServiceError(
        "다른 조직의 후보자 풀에는 접근할 수 없습니다.",
        403,
        "TENANT_ACCESS_DENIED"
      );
    }

    return actor.organizationId;
  }

  const organizationId =
    organizationIdInput?.trim() ||
    actor.organizationId?.trim() ||
    "";

  if (!organizationId) {
    throw new CandidatePoolServiceError(
      "조회할 조직 ID가 필요합니다.",
      400,
      "ORGANIZATION_ID_REQUIRED"
    );
  }

  return organizationId;
}

function normalizeSkills(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0
    )
    .map((item) => item.trim())
    .slice(0, 20);
}

function normalizeCompleteness(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(value))
  );
}

function normalizeAccountStatus(
  value: unknown
): CandidatePoolItem["accountStatus"] {
  if (
    value === "INACTIVE" ||
    value === "SUSPENDED"
  ) {
    return value;
  }

  return "ACTIVE";
}

function requireCandidateString(
  data: DocumentData,
  key: string
): string | null {
  const value = data[key];
  return isNonEmptyString(value)
    ? value.trim()
    : null;
}

export async function listB2BCandidatePool(
  actorUid: string,
  organizationIdInput?: string
): Promise<CandidatePoolItem[]> {
  const actor = await requireB2BActor(actorUid);

  const organizationId = resolveOrganizationId(
    actor,
    organizationIdInput
  );

  const db = getFirebaseAdminDb();

  const candidateSnapshot = await db
    .collection("candidates")
    .where("organizationId", "==", organizationId)
    .get();

  const items = await Promise.all(
    candidateSnapshot.docs.map(async (document) => {
      const data = document.data();

      if (
        data.source !== "B2B_DIRECT" ||
        data.authUid !== null
      ) {
        return null;
      }

      const candidateId =
        requireCandidateString(data, "candidateId") ||
        document.id;

      const name = requireCandidateString(data, "name");
      const phone = requireCandidateString(data, "phone");
      const email = requireCandidateString(data, "email");
      const createdBy = requireCandidateString(data, "createdBy");

      if (
        !name ||
        !phone ||
        !email ||
        !createdBy
      ) {
        return null;
      }

      const profileSnapshot = await db
        .collection("profile")
        .doc(candidateId)
        .get();

      const profile = profileSnapshot.data();

      return {
        candidateId,
        organizationId,
        name,
        phone,
        email,
        source: "B2B_DIRECT" as const,
        accountStatus: normalizeAccountStatus(
          data.accountStatus
        ),
        createdBy,
        headline:
          profile && isNonEmptyString(profile.headline)
            ? profile.headline.trim()
            : "",
        skills: normalizeSkills(profile?.skills),
        profileCompleteness: normalizeCompleteness(
          profile?.profileCompleteness
        ),
        createdAt: timestampToIsoString(data.createdAt),
        updatedAt: timestampToIsoString(data.updatedAt),
      } satisfies CandidatePoolItem;
    })
  );

  return items
    .filter(
      (item): item is CandidatePoolItem =>
        item !== null
    )
    .sort((a, b) => {
      const aTime = a.updatedAt
        ? Date.parse(a.updatedAt)
        : 0;
      const bTime = b.updatedAt
        ? Date.parse(b.updatedAt)
        : 0;

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return a.name.localeCompare(b.name, "ko");
    });
}
