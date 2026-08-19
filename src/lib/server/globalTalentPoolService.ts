import type { DocumentData } from "firebase-admin/firestore";

import type { JobSearchStatus } from "../candidatePreferenceTypes";
import {
  B2BAuthorizationError,
  requireB2BActor,
} from "./b2bAuthorization";
import { getFirebaseAdminDb } from "./firebaseAdmin";

export class GlobalTalentPoolServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "GLOBAL_TALENT_POOL_SERVICE_ERROR"
  ) {
    super(message);
    this.name = "GlobalTalentPoolServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface GlobalTalentPoolItem {
  candidateId: string;
  name: string;
  phone: string;
  email: string;
  headline: string;
  skills: string[];
  desiredJob: string;
  desiredLocation: string;
  desiredSalary: string;
  desiredEmploymentType: string;
  jobSearchStatus: JobSearchStatus;
  availableFrom: string;
  profileCompleteness: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GlobalTalentPoolPagination {
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GlobalTalentPoolPageResult {
  items: GlobalTalentPoolItem[];
  pagination: GlobalTalentPoolPagination;
}

interface ListOptions {
  cursor?: string;
  limit?: string | number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const GLOBAL_SCAN_LIMIT = 2_000;
const SEARCH_RESULT_LIMIT = 50;
const JOB_SEARCH_STATUSES = new Set<JobSearchStatus>([
  "ACTIVE",
  "OPEN",
  "NOT_LOOKING",
]);

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
}

function statusValue(value: unknown): JobSearchStatus {
  return JOB_SEARCH_STATUSES.has(value as JobSearchStatus)
    ? (value as JobSearchStatus)
    : "OPEN";
}

function completenessValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}

function timestampToIso(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const timestamp = value as { toDate?: () => Date };
  if (typeof timestamp.toDate !== "function") return null;
  try {
    return timestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

async function requireAdmin(actorUid: string): Promise<void> {
  const actor = await requireB2BActor(actorUid);
  if (actor.role !== "ADMIN") {
    throw new GlobalTalentPoolServiceError(
      "J&C 공개 인재풀은 ADMIN 계정만 조회할 수 있습니다.",
      403,
      "GLOBAL_TALENT_POOL_ADMIN_REQUIRED"
    );
  }
}

function normalizePageSize(value: string | number | undefined): number {
  if (value === undefined) return DEFAULT_PAGE_SIZE;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
    throw new GlobalTalentPoolServiceError(
      `limit은 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
      400,
      "INVALID_PAGE_LIMIT"
    );
  }
  return parsed;
}

function encodeOffset(offset: number): string {
  return Buffer.from(
    JSON.stringify({ offset }),
    "utf8"
  ).toString("base64url");
}

function decodeOffset(value?: string): number {
  if (!value?.trim()) return 0;
  try {
    const parsed = JSON.parse(
      Buffer.from(value.trim(), "base64url").toString("utf8")
    ) as { offset?: unknown };

    if (
      !Number.isInteger(parsed.offset) ||
      (parsed.offset as number) < 0 ||
      (parsed.offset as number) > GLOBAL_SCAN_LIMIT
    ) {
      throw new Error("INVALID_OFFSET");
    }

    return parsed.offset as number;
  } catch {
    throw new GlobalTalentPoolServiceError(
      "인재풀 페이지 cursor가 올바르지 않습니다.",
      400,
      "INVALID_PAGE_CURSOR"
    );
  }
}

function isVisibleGlobalCandidate(data: DocumentData): boolean {
  return (
    data.source === "B2C_SELF" &&
    data.accountStatus === "ACTIVE" &&
    data.talentPoolOptIn === true
  );
}

async function hydrate(
  documents: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
): Promise<GlobalTalentPoolItem[]> {
  const db = getFirebaseAdminDb();
  const profileRefs = documents.map((document) =>
    db.collection("profile").doc(document.id)
  );
  const snapshots = profileRefs.length ? await db.getAll(...profileRefs) : [];
  const profiles = new Map<string, DocumentData | undefined>();

  for (const snapshot of snapshots) {
    profiles.set(snapshot.id, snapshot.data());
  }

  return documents
    .map((document) => {
      const candidate = document.data();
      const profile = profiles.get(document.id) || {};
      const name = stringValue(candidate.name);
      const phone = stringValue(candidate.phone);
      const email = stringValue(candidate.email);
      if (!name || !phone || !email) return null;

      return {
        candidateId: document.id,
        name,
        phone,
        email,
        headline: stringValue(profile.headline),
        skills: stringArray(profile.skills),
        desiredJob: stringValue(profile.desiredJob),
        desiredLocation: stringValue(profile.desiredLocation),
        desiredSalary: stringValue(profile.desiredSalary),
        desiredEmploymentType: stringValue(profile.desiredEmploymentType),
        jobSearchStatus: statusValue(
          profile.jobSearchStatus || candidate.jobSearchStatus
        ),
        availableFrom: stringValue(profile.availableFrom),
        profileCompleteness: completenessValue(profile.profileCompleteness),
        createdAt: timestampToIso(candidate.createdAt),
        updatedAt: timestampToIso(
          profile.updatedAt || candidate.updatedAt
        ),
      } satisfies GlobalTalentPoolItem;
    })
    .filter((item): item is GlobalTalentPoolItem => item !== null);
}

async function loadVisibleGlobalCandidates() {
  // Initial public release intentionally avoids a new composite-index dependency.
  // Scan the latest candidates by the existing updatedAt single-field index, then
  // enforce B2C + active + explicit talent-pool consent on the server. At scale,
  // replace this bounded scan with a dedicated indexed/search-backed pool.
  const snapshot = await getFirebaseAdminDb()
    .collection("candidates")
    .orderBy("updatedAt", "desc")
    .limit(GLOBAL_SCAN_LIMIT)
    .get();

  return snapshot.docs.filter((document) =>
    isVisibleGlobalCandidate(document.data())
  );
}

export async function listGlobalTalentPool(
  actorUid: string,
  options: ListOptions = {}
): Promise<GlobalTalentPoolPageResult> {
  await requireAdmin(actorUid);
  const pageSize = normalizePageSize(options.limit);
  const offset = decodeOffset(options.cursor);
  const visibleDocuments = await loadVisibleGlobalCandidates();
  const documents = visibleDocuments.slice(offset, offset + pageSize);
  const items = await hydrate(documents);
  const nextOffset = offset + pageSize;
  const hasMore = nextOffset < visibleDocuments.length;

  return {
    items,
    pagination: {
      total: visibleDocuments.length,
      limit: pageSize,
      hasMore,
      nextCursor: hasMore ? encodeOffset(nextOffset) : null,
    },
  };
}

export async function searchGlobalTalentPool(
  actorUid: string,
  queryInput: string
): Promise<GlobalTalentPoolPageResult> {
  await requireAdmin(actorUid);
  const queryText = queryInput.trim().toLocaleLowerCase("ko-KR");
  if (queryText.length < 2) {
    throw new GlobalTalentPoolServiceError(
      "인재풀 검색어는 2자 이상 입력해주세요.",
      400,
      "TALENT_POOL_QUERY_TOO_SHORT"
    );
  }

  const visibleDocuments = await loadVisibleGlobalCandidates();
  const hydrated = await hydrate(visibleDocuments);
  const matches = hydrated.filter((candidate) =>
    [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.headline,
      candidate.desiredJob,
      candidate.desiredLocation,
      candidate.desiredSalary,
      candidate.desiredEmploymentType,
      candidate.availableFrom,
      ...candidate.skills,
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(queryText)
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

export { B2BAuthorizationError };
