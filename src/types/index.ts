// ============================================================================
// The Lobby - Shared Domain Types v3
// Phase 1B: Domain Foundation
//
// 원칙
// 1. Candidate ID와 Firebase Auth UID는 서로 다른 식별자다.
// 2. Firestore 저장 시간은 서버 Timestamp를 기준으로 한다.
// 3. Application은 항상 organizationId와 recruiterId를 가진다.
// 4. Application / AppEvent는 tenant 경계를 명시적으로 가진다.
// 5. B2C 가입 후보자와 B2B 직접 발굴 후보자를 모두 지원한다.
// ============================================================================

// ---------------------------------------------------------------------------
// 0. Firestore 공통 시간 타입
// ---------------------------------------------------------------------------

/**
 * Firebase Client SDK의 Timestamp와
 * Firebase Admin SDK의 Timestamp를 모두 수용하기 위한 구조적 타입.
 *
 * DB에서 읽은 Timestamp를 ISO string으로 억지 변환하여
 * Domain Model에 저장하지 않는다.
 *
 * UI에서 문자열 날짜가 필요한 경우 ViewModel 계층에서 변환한다.
 */
export interface DbTimestamp {
  toDate(): Date;
  toMillis(): number;
}

// ---------------------------------------------------------------------------
// 1. User / Organization / Role
// ---------------------------------------------------------------------------

export type UserRole =
  | "ADMIN"
  | "RECRUITER"
  | "CANDIDATE";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export type OrganizationStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface Organization {
  organizationId: string;

  name: string;

  status: OrganizationStatus;

  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
}

/**
 * Firebase Auth 계정과 The Lobby 내부 권한 정보를 연결한다.
 *
 * ADMIN / RECRUITER:
 * organizationId 필수
 *
 * CANDIDATE:
 * organizationId는 null 가능
 */
export interface User {
  uid: string;

  email: string;

  name: string;

  role: UserRole;

  organizationId: string | null;

  status: UserStatus;

  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 2. Candidate
// ---------------------------------------------------------------------------

export type CandidateAccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export type CandidateSource =
  | "B2C_SELF"
  | "B2B_DIRECT"
  | "HEADHUNTING"
  | "REFERRAL"
  | "IMPORT";

/**
 * Candidate는 Firebase User가 아니다.
 *
 * candidateId:
 * The Lobby 내부 Candidate PK
 *
 * authUid:
 * B2C 가입자가 Firebase Auth를 연결했을 때만 존재한다.
 *
 * organizationId / createdBy:
 * B2B에서 서버가 생성한 Candidate의 tenant provenance다.
 * B2C_SELF Candidate 문서에는 존재하지 않을 수 있으므로 optional로 둔다.
 * legacy 문서의 null 값도 읽을 수 있도록 null을 수용한다.
 *
 * 예:
 *
 * B2C 가입자
 * candidateId = "abc123"
 * authUid = "firebaseUid..."
 *
 * B2B 직접 발굴 후보자
 * candidateId = "xyz789"
 * authUid = null
 * organizationId = "org_..."
 * createdBy = "recruiterFirebaseUid..."
 */
export interface Candidate {
  candidateId: string;

  authUid: string | null;

  name: string;

  phone: string;

  email: string;

  source: CandidateSource;

  accountStatus: CandidateAccountStatus;

  organizationId?: string | null;

  createdBy?: string | null;

  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 3. Profile
// ---------------------------------------------------------------------------

export interface CareerItem {
  companyName: string;

  role: string;

  period: string;

  description: string;
}

export interface EducationItem {
  schoolName: string;

  major?: string;

  degree?: string;

  period?: string;
}

export interface CertificationItem {
  name: string;

  issuer?: string;

  acquiredAt?: string;
}

export interface LanguageItem {
  language: string;

  level?: string;

  testName?: string;

  score?: string;
}

export interface Profile {
  candidateId: string;

  headline: string;

  careerSummary: string;

  skills: string[];

  careers: CareerItem[];

  education: EducationItem[];

  certifications?: CertificationItem[];

  languages?: LanguageItem[];

  desiredJob?: string;

  desiredLocation?: string;

  desiredSalary?: string;

  /**
   * 0 ~ 100
   */
  profileCompleteness: number;

  updatedAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 4. Job
// ---------------------------------------------------------------------------

export type JobStatus =
  | "OPEN"
  | "CLOSED"
  | "DRAFT";

export interface Job {
  jobId: string;

  /**
   * 해당 공고를 소유한 tenant.
   */
  organizationId: string;

  company: string;

  /**
   * 블라인드 공고 등에 사용하는 실제 화면 노출 기업명.
   */
  displayCompany: string;

  title: string;

  description: string;

  requirements: string[];

  preferredQualifications: string[];

  salary: string;

  location: string;

  employmentType: string;

  status: JobStatus;

  /**
   * 공고의 최초 담당 Recruiter Firebase UID.
   */
  recruiterId: string;

  createdAt: DbTimestamp;
  updatedAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 5. Application
// ---------------------------------------------------------------------------

export type ApplicationStage =
  | "NEW"
  | "REVIEWING"
  | "CONTACTED"
  | "RECOMMEND_PENDING"
  | "RECOMMENDED"
  | "DOCUMENT_SCREEN"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "HOLD"
  | "REJECTED"
  | "CANCELED";

export type ApplicationSource =
  | "B2C_WEB"
  | "B2B_DIRECT"
  | "HEADHUNTING"
  | "REFERRAL";

export interface ApplicationSnapshotCandidate {
  name: string;

  phone: string;

  email: string;
}

export interface ApplicationSnapshotJob {
  title: string;

  company: string;
}

/**
 * Candidate : Application = 1 : N
 *
 * 하나의 Candidate는 여러 Job에 독립적인 Application을 생성할 수 있다.
 *
 * applicationId는 현재 다음 deterministic 규칙을 사용한다.
 *
 * candidateId__jobId
 */
export interface Application {
  applicationId: string;

  candidateId: string;

  jobId: string;

  /**
   * Application의 tenant.
   *
   * Job.organizationId에서 생성 시 강제 상속한다.
   */
  organizationId: string;

  /**
   * Application 담당 Recruiter.
   *
   * 신규 지원 시 기본적으로 Job.recruiterId를 상속한다.
   */
  recruiterId: string;

  stage: ApplicationStage;

  source: ApplicationSource;

  /**
   * B2B 목록 렌더링 시 Candidate / Job N+1 조회를 방지하기 위한
   * 최소 Snapshot.
   */
  candidateSnapshot: ApplicationSnapshotCandidate;

  jobSnapshot: ApplicationSnapshotJob;

  appliedAt: DbTimestamp;

  updatedAt: DbTimestamp;

  lastActivityAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 6. Application Event / Audit Trail
// ---------------------------------------------------------------------------

export type EventType =
  | "APPLICATION_CREATED"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "RECRUITER_ASSIGNED"
  | "EMAIL_SENT"
  | "INTERVIEW_SCHEDULED"
  | "PROFILE_UPDATED";

export interface AppEvent {
  eventId: string;

  applicationId: string;

  /**
   * Audit Event도 반드시 tenant 경계를 가진다.
   *
   * Application.organizationId를 이벤트 생성 시 복사한다.
   */
  organizationId: string;

  type: EventType;

  fromStage?: ApplicationStage;

  toStage?: ApplicationStage;

  /**
   * 실제 요청 주체의 Firebase Auth UID.
   *
   * 클라이언트가 임의 문자열을 넣는 값으로 사용하지 않는다.
   * 최종적으로 Server Application Service에서 인증 토큰으로부터 결정한다.
   */
  changedBy: string;

  note?: string;

  metadata?: Record<string, unknown>;

  createdAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 7. B2B Application View Model
// ---------------------------------------------------------------------------

/**
 * Firestore Domain Object 자체에 ISO string을 섞지 않는다.
 *
 * B2B UI에서 표시하기 쉽게 변환한 별도의 View Model을 사용한다.
 */
export interface ApplicationView {
  applicationId: string;

  candidateId: string;

  jobId: string;

  organizationId: string;

  recruiterId: string;

  stage: ApplicationStage;

  source: ApplicationSource;

  candidateName: string;

  candidatePhone: string;

  candidateEmail: string;

  jobTitle: string;

  company: string;

  appliedAt: string;

  updatedAt?: string;

  lastActivityAt?: string;
}
