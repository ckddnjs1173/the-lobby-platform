// --- 0. System, Role & Organization ---
export type UserRole = "ADMIN" | "RECRUITER" | "CANDIDATE";

export interface Organization {
  organizationId: string;
  name: string;
  createdAt: string;
}

export interface UserUser {
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  createdAt: string;
}

export type ApplicationSource = "B2C_WEB" | "B2B_DIRECT" | "HEADHUNTING" | "REFERRAL";

// --- 1. Candidate (구직자 본체 - 비회원 외부 후보자 지원) ---
export interface Candidate {
  candidateId: string;       // The Lobby 내부 관리용 고유 ID (Auto-ID 또는 UUID)
  authUid?: string | null;   // B2C 가입자만 연결되는 Firebase Auth UID (외부 발굴자는 null/undefined)
  name: string;
  phone: string;
  email: string;
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

// --- 2. Profile (커리어 정보 - 1:1 관계) ---
export interface CareerItem {
  companyName: string;
  role: string;
  period: string;
  description: string;
}

export interface Profile {
  candidateId: string;
  headline: string;
  careerSummary: string;
  skills: string[];
  careers: CareerItem[];
  education: string[];
  profileCompleteness: number; // 완성도 퍼센트 (예: 78)
  updatedAt: string;
}

// --- 3. Job (채용 공고) ---
export interface Job {
  jobId: string;
  organizationId: string; // 멀티테넌트 필수 격리 필드
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string[];
  preferredQualifications: string[];
  salary: string;
  location: string;
  employmentType: string;
  status: "OPEN" | "CLOSED" | "DRAFT";
  recruiterId: string;
  createdAt: string;
  updatedAt: string;
}

// --- 4. Application (지원 내역 - 1:N 관계 및 N+1 방지 Denormalization) ---
export type ApplicationStage =
  | "NEW"              // 신규
  | "REVIEWING"        // 검토
  | "CONTACTED"        // 연락
  | "RECOMMEND_PENDING"// 추천 예정
  | "RECOMMENDED"      // 고객사 추천
  | "DOCUMENT_SCREEN"  // 서류전형
  | "INTERVIEW"        // 면접
  | "OFFER"            // 처우협의
  | "HIRED"            // 합격 / 입사
  | "HOLD"             // 보류 (Terminal)
  | "REJECTED"         // 탈락 (Terminal)
  | "CANCELED";        // 지원취소 (Terminal)

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
  organizationId: string; // 권한 및 테넌트 필터링용
  recruiterId?: string;
  stage: ApplicationStage;
  source: ApplicationSource;
  
  // N+1 쿼리 방지를 위한 스냅샷 비정규화
  candidateSnapshot: ApplicationSnapshotCandidate;
  jobSnapshot: ApplicationSnapshotJob;

  appliedAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

// --- 5. App Event (활동 및 감사 로그 - Audit Trail) ---
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
  type: EventType;
  fromStage?: ApplicationStage;
  toStage?: ApplicationStage;
  changedBy: string; // 실제 요청 주체인 관리자/구직자의 Firebase UID 또는 시스템 식별자
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}