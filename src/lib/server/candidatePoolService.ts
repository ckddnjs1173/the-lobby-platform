import {
  FieldPath,
  Timestamp,
  type DocumentData,
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
  createdByName: string | null;
  headline: string;
  skills: string[];
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CandidatePoolPagination {
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CandidatePoolPageResult {
  items: CandidatePoolItem[];
  pagination: CandidatePoolPagination;
}

interface CandidatePoolListOptions {
  organizationId?: string;
  cursor?: string;
  limit?: string | number;
}

interface CandidatePoolCursor {
  seconds: number;
  nanoseconds: number;
  documentId: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const SEARCH_SCAN_LIMIT = 500;
const SEARCH_RESULT_LIMIT = 50;

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

function normalizePageSize(
  value: string | number | undefined
): number {
  if (value === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_PAGE_SIZE
  ) {
    throw new CandidatePoolServiceError(
      `limit은 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
      400,
      "INVALID_PAGE_LIMIT"
    );
  }

  return parsed;
}

function encodeCursor(
  data: DocumentData,
  documentId: string
): string {
  const updatedAt = data.updatedAt;

  if (!(updatedAt instanceof Timestamp)) {
    throw new CandidatePoolServiceError(
      "후보자 pagination cursor를 생성할 수 없습니다.",
      409,
      "CANDIDATE_UPDATED_AT_MISSING"
    );
  }

  const payload: CandidatePoolCursor = {
    seconds: updatedAt.seconds,
    nanoseconds: updatedAt.nanoseconds,
    documentId,
  };

  return Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
}

function decodeCursor(
  value?: string
): CandidatePoolCursor | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(
        value.trim(),
        "base64url"
      ).toString("utf8")
    ) as Partial<CandidatePoolCursor>;

    if (
      !Number.isInteger(parsed.seconds) ||
      !Number.isInteger(parsed.nanoseconds) ||
      !isNonEmptyString(parsed.documentId)
    ) {
      throw new Error("INVALID_CURSOR_PAYLOAD");
    }

    return {
      seconds: parsed.seconds as number,
      nanoseconds: parsed.nanoseconds as number,
      documentId: parsed.documentId.trim(),
    };
  } catch {
    throw new CandidatePoolServiceError(
      "후보자 페이지 cursor가 올바르지 않습니다.",
      400,
      "INVALID_PAGE_CURSOR"
    );
  }
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

function resolveCreatorName(
  userData: DocumentData | undefined,
  candidateOrganizationId: string
): string | null {
  if (!userData) return null;

  const name = isNonEmptyString(userData.name)
    ? userData.name.trim()
    : null;

  if (!name) return null;
  if (userData.role === "ADMIN") return name;
  if (userData.role !== "RECRUITER") return null;

  const creatorOrganizationId = isNonEmptyString(userData.organizationId)
    ? userData.organizationId.trim()
    : null;

  return creatorOrganizationId === candidateOrganizationId
    ? name
    : null;
}

interface NormalizedCandidate {
  candidateId: string;
  data: DocumentData;
  name: string;
  phone: string;
  email: string;
  createdBy: string;
}

function normalizeCandidateDocument(
  document: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
): NormalizedCandidate | null {
  const data = document.data();
  const candidateId = requireCandidateString(data, "candidateId") || document.id;
  const name = requireCandidateString(data, "name");
  const phone = requireCandidateString(data, "phone");
  const email = requireCandidateString(data, "email");
  const createdBy = requireCandidateString(data, "createdBy");

  if (!name || !phone || !email || !createdBy) return null;

  return {
    candidateId,
    data,
    name,
    phone,
    email,
    createdBy,
  };
}

async function hydrateCandidateItems(
  organizationId: string,
  candidates: NormalizedCandidate[]
): Promise<CandidatePoolItem[]> {
  const db = getFirebaseAdminDb();
  const profileRefs = candidates.map((candidate) =>
    db.collection("profile").doc(candidate.candidateId)
  );
  const creatorIds = Array.from(new Set(candidates.map((candidate) => candidate.createdBy)));
  const creatorRefs = creatorIds.map((uid) => db.collection("users").doc(uid));

  const relatedSnapshots =
    profileRefs.length + creatorRefs.length > 0
      ? await db.getAll(...profileRefs, ...creatorRefs)
      : [];

  const profiles = new Map<string, DocumentData | undefined>();
  const users = new Map<string, DocumentData | undefined>();

  for (const snapshot of relatedSnapshots) {
    if (snapshot.ref.parent.id === "profile") profiles.set(snapshot.id, snapshot.data());
    if (snapshot.ref.parent.id === "users") users.set(snapshot.id, snapshot.data());
  }

  return candidates.map((candidate) => {
    const profile = profiles.get(candidate.candidateId);

    return {
      candidateId: candidate.candidateId,
      organizationId,
      name: candidate.name,
      phone: candidate.phone,
      email: candidate.email,
      source: "B2B_DIRECT" as const,
      accountStatus: normalizeAccountStatus(candidate.data.accountStatus),
      createdBy: candidate.createdBy,
      createdByName: resolveCreatorName(users.get(candidate.createdBy), organizationId),
      headline:
        profile && isNonEmptyString(profile.headline)
          ? profile.headline.trim()
          : "",
      skills: normalizeSkills(profile?.skills),
      profileCompleteness: normalizeCompleteness(profile?.profileCompleteness),
      createdAt: timestampToIsoString(candidate.data.createdAt),
      updatedAt: timestampToIsoString(candidate.data.updatedAt),
    } satisfies CandidatePoolItem;
  });
}

function baseCandidateQuery(organizationId: string) {
  return getFirebaseAdminDb()
    .collection("candidates")
    .where("organizationId", "==", organizationId)
    .where("source", "==", "B2B_DIRECT")
    .where("authUid", "==", null);
}

export async function listB2BCandidatePool(
  actorUid: string,
  options: CandidatePoolListOptions = {}
): Promise<CandidatePoolPageResult> {
  const actor = await requireB2BActor(actorUid);
  const organizationId = resolveOrganizationId(actor, options.organizationId);
  const pageSize = normalizePageSize(options.limit);
  const cursor = decodeCursor(options.cursor);
  const baseQuery = baseCandidateQuery(organizationId);

  let pageQuery = baseQuery
    .orderBy("updatedAt", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(pageSize + 1);

  if (cursor) {
    pageQuery = pageQuery.startAfter(
      new Timestamp(cursor.seconds, cursor.nanoseconds),
      cursor.documentId
    );
  }

  const [candidateSnapshot, countSnapshot] = await Promise.all([
    pageQuery.get(),
    baseQuery.count().get(),
  ]);

  const hasMore = candidateSnapshot.docs.length > pageSize;
  const pageDocuments = candidateSnapshot.docs.slice(0, pageSize);
  const normalizedCandidates = pageDocuments
    .map(normalizeCandidateDocument)
    .filter((item): item is NormalizedCandidate => item !== null);
  const items = await hydrateCandidateItems(organizationId, normalizedCandidates);
  const lastDocument = pageDocuments.length > 0
    ? pageDocuments[pageDocuments.length - 1]
    : null;

  return {
    items,
    pagination: {
      total: countSnapshot.data().count,
      limit: pageSize,
      hasMore,
      nextCursor:
        hasMore && lastDocument
          ? encodeCursor(lastDocument.data(), lastDocument.id)
          : null,
    },
  };
}

export async function searchB2BCandidatePool(
  actorUid: string,
  queryInput: string,
  organizationIdInput?: string
): Promise<CandidatePoolPageResult> {
  const actor = await requireB2BActor(actorUid);
  const organizationId = resolveOrganizationId(actor, organizationIdInput);
  const query = queryInput.trim().toLocaleLowerCase("ko-KR");

  if (query.length < 2) {
    throw new CandidatePoolServiceError(
      "후보자 검색어는 2자 이상 입력해주세요.",
      400,
      "CANDIDATE_SEARCH_QUERY_TOO_SHORT"
    );
  }

  const snapshot = await baseCandidateQuery(organizationId)
    .orderBy("updatedAt", "desc")
    .limit(SEARCH_SCAN_LIMIT)
    .get();

  const normalizedCandidates = snapshot.docs
    .map(normalizeCandidateDocument)
    .filter((item): item is NormalizedCandidate => item !== null);

  const hydrated = await hydrateCandidateItems(organizationId, normalizedCandidates);
  const matches = hydrated.filter((candidate) =>
    [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.headline,
      ...candidate.skills,
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(query)
  );

  return {
    items: matches.slice(0, SEARCH_RESULT_LIMIT),
    pagination: {
      total: matches.length,
      limit: SEARCH_RESULT_LIMIT,
      hasMore: matches.length > SEARCH_RESULT_LIMIT,
      nextCursor: null,
    },
  };
}
