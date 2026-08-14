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

export interface Candidate {
  candidateId: string;
  authUid: string | null;
  name: string;
  phone: string;
  email: string;
  source: CandidateSource;
  accountStatus: CandidateAccountStatus;

  /**
   * B2B에서 서버가 생성한 Candidate의 tenant provenance.
   * B2C_SELF 및 legacy 문서를 위해 optional/null을 수용한다.
   */
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
  organizationId: string;
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  status: JobStatus;
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

export interface Application {
  applicationId: string;
  candidateId: string;
  jobId: string;
  organizationId: string;
  recruiterId: string;
  stage: ApplicationStage;
  source: ApplicationSource;
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
  | "INTERVIEW_UPDATED"
  | "INTERVIEW_COMPLETED"
  | "INTERVIEW_CANCELED"
  | "PROFILE_UPDATED";

export interface AppEvent {
  eventId: string;
  applicationId: string;
  organizationId: string;
  type: EventType;
  fromStage?: ApplicationStage;
  toStage?: ApplicationStage;
  changedBy: string;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: DbTimestamp;
}

// ---------------------------------------------------------------------------
// 7. B2B Application View Model
// ---------------------------------------------------------------------------

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
