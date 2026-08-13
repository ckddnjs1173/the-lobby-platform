"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import toast from "react-hot-toast";

import {
  db,
} from "../../lib/firebase";

import {
  ApplicationApiError,
  updateApplicationStageViaApi,
} from "../../lib/applicationApi";

import {
  B2BApiError,
  fetchB2BCandidateProfile,
  type B2BCandidateProfile,
} from "../../lib/b2bApi";

import {
  useB2BSession,
} from "../../components/b2b-admin/B2BSessionContext";

import type {
  Application,
  ApplicationStage,
  ApplicationView,
} from "../../types";

import ApplicationTable from "../../components/b2b-admin/ApplicationTable";
import ApplicationKanban from "../../components/b2b-admin/ApplicationKanban";
import ApplicationSlideOver from "../../components/b2b-admin/ApplicationSlideOver";

// ============================================================================
// View Helpers
// ============================================================================

function toIsoString(
  value: unknown
): string {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value ===
      "object" &&
    value !== null
  ) {
    const timestampLike =
      value as {
        toDate?: () => Date;
      };

    if (
      typeof timestampLike.toDate ===
      "function"
    ) {
      try {
        return timestampLike
          .toDate()
          .toISOString();
      } catch {
        return "";
      }
    }
  }

  return "";
}

function createApplicationView(
  application: Application,
  fallbackDocumentId: string
): ApplicationView {
  return {
    applicationId:
      application.applicationId ||
      fallbackDocumentId,

    candidateId:
      application.candidateId,

    jobId:
      application.jobId,

    organizationId:
      application.organizationId,

    recruiterId:
      application.recruiterId,

    stage:
      application.stage,

    source:
      application.source,

    candidateName:
      application
        .candidateSnapshot
        ?.name ||
      "이름 없음",

    candidatePhone:
      application
        .candidateSnapshot
        ?.phone ||
      "-",

    candidateEmail:
      application
        .candidateSnapshot
        ?.email ||
      "-",

    jobTitle:
      application
        .jobSnapshot
        ?.title ||
      "공고명 없음",

    company:
      application
        .jobSnapshot
        ?.company ||
      "기업명 없음",

    appliedAt:
      toIsoString(
        application.appliedAt
      ),

    updatedAt:
      toIsoString(
        application.updatedAt
      ),

    lastActivityAt:
      toIsoString(
        application.lastActivityAt
      ),
  };
}

function sortApplicationsByAppliedAt(
  applications: ApplicationView[]
): ApplicationView[] {
  return [
    ...applications,
  ].sort((a, b) => {
    const aTime =
      Date.parse(
        a.appliedAt
      );

    const bTime =
      Date.parse(
        b.appliedAt
      );

    const normalizedA =
      Number.isNaN(aTime)
        ? 0
        : aTime;

    const normalizedB =
      Number.isNaN(bTime)
        ? 0
        : bTime;

    return (
      normalizedB -
      normalizedA
    );
  });
}

// ============================================================================
// Component
// ============================================================================

export default function B2BAdminPage() {
  const router =
    useRouter();

  const session =
    useB2BSession();

  const [
    applications,
    setApplications,
  ] = useState<
    ApplicationView[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    viewMode,
    setViewMode,
  ] = useState<
    "TABLE" | "KANBAN"
  >("TABLE");

  const [
    selectedApp,
    setSelectedApp,
  ] =
    useState<ApplicationView | null>(
      null
    );

  const [
    candidateProfile,
    setCandidateProfile,
  ] =
    useState<B2BCandidateProfile | null>(
      null
    );

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  const [
    otherApplications,
    setOtherApplications,
  ] = useState<
    ApplicationView[]
  >([]);

  const [
    isSlideOverOpen,
    setIsSlideOverOpen,
  ] = useState(false);

  // ==========================================================================
  // Tenant-aware Application Subscription
  // ==========================================================================

  useEffect(() => {
    setLoading(true);

    const applicationsReference =
      collection(
        db,
        "applications"
      );

    const applicationsQuery =
      session.role ===
      "ADMIN"
        ? query(
            applicationsReference
          )
        : query(
            applicationsReference,

            where(
              "organizationId",
              "==",
              session.organizationId
            )
          );

    const unsubscribe =
      onSnapshot(
        applicationsQuery,

        (snapshot) => {
          const views =
            snapshot.docs.map(
              (
                applicationDocument
              ) => {
                const application =
                  applicationDocument.data() as Application;

                return createApplicationView(
                  application,
                  applicationDocument.id
                );
              }
            );

          setApplications(
            sortApplicationsByAppliedAt(
              views
            )
          );

          setLoading(
            false
          );
        },

        (error) => {
          console.error(
            "Application subscription error:",
            error
          );

          setApplications(
            []
          );

          setLoading(
            false
          );

          toast.error(
            "권한이 있는 지원 내역을 불러오지 못했습니다."
          );
        }
      );

    return unsubscribe;
  }, [
    session.role,
    session.organizationId,
  ]);

  // ==========================================================================
  // Application Detail
  // ==========================================================================

  const handleSelectApplication =
    async (
      application: ApplicationView
    ) => {
      if (
        session.role ===
          "RECRUITER" &&
        application.organizationId !==
          session.organizationId
      ) {
        toast.error(
          "다른 조직의 지원 정보에는 접근할 수 없습니다."
        );

        return;
      }

      setSelectedApp(
        application
      );

      setIsSlideOverOpen(
        true
      );

      setCandidateProfile(
        null
      );

      const candidateApplications =
        applications.filter(
          (item) =>
            item.candidateId ===
              application.candidateId &&
            item.applicationId !==
              application.applicationId
        );

      setOtherApplications(
        candidateApplications
      );

      setProfileLoading(
        true
      );

      try {
        const profile =
          await fetchB2BCandidateProfile(
            application.applicationId
          );

        setCandidateProfile(
          profile
        );
      } catch (error) {
        console.error(
          "Candidate profile API error:",
          error
        );

        setCandidateProfile(
          null
        );

        if (
          error instanceof
          B2BApiError
        ) {
          if (
            error.status ===
            401
          ) {
            toast.error(
              "관리자 로그인 세션이 만료되었습니다."
            );

            router.replace(
              "/b2b-admin/login"
            );

            return;
          }

          toast.error(
            error.message
          );

          return;
        }

        toast.error(
          "지원자의 상세 프로필을 불러오지 못했습니다."
        );
      } finally {
        setProfileLoading(
          false
        );
      }
    };

  // ==========================================================================
  // Server Stage Update
  // ==========================================================================

  const handleStageChange =
    async (
      applicationId: string,
      newStage: ApplicationStage,
      note?: string
    ) => {
      try {
        const result =
          await updateApplicationStageViaApi(
            applicationId,
            newStage,
            note
          );

        if (
          !result.changed
        ) {
          return;
        }

        toast.success(
          "지원 단계가 성공적으로 변경되었습니다."
        );

        setSelectedApp(
          (previous) => {
            if (!previous) {
              return null;
            }

            if (
              previous.applicationId !==
              applicationId
            ) {
              return previous;
            }

            return {
              ...previous,

              stage:
                result.stage,
            };
          }
        );

        setOtherApplications(
          (previous) =>
            previous.map(
              (
                application
              ) => {
                if (
                  application.applicationId !==
                  applicationId
                ) {
                  return application;
                }

                return {
                  ...application,

                  stage:
                    result.stage,
                };
              }
            )
        );
      } catch (error) {
        if (
          error instanceof
          ApplicationApiError
        ) {
          if (
            error.status ===
            401
          ) {
            toast.error(
              "관리자 로그인 세션이 만료되었습니다."
            );

            router.replace(
              "/b2b-admin/login"
            );

            return;
          }

          toast.error(
            error.message
          );

          return;
        }

        console.error(
          "Stage update error:",
          error
        );

        toast.error(
          "지원 단계 변경 중 오류가 발생했습니다."
        );
      }
    };

  // ==========================================================================
  // Close Detail
  // ==========================================================================

  const handleCloseSlideOver =
    () => {
      setIsSlideOverOpen(
        false
      );

      setSelectedApp(
        null
      );

      setCandidateProfile(
        null
      );

      setProfileLoading(
        false
      );

      setOtherApplications(
        []
      );
    };

  // ==========================================================================
  // Loading
  // ==========================================================================

  if (loading) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center text-slate-400 font-medium">
        권한이 있는 지원 내역을
        불러오는 중입니다...
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              지원자 진행관리 Workspace
            </h1>

            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
              {session.role}
            </span>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            총{" "}
            <span className="font-semibold text-brand-navy">
              {applications.length}건
            </span>
            의 지원 내역이 실시간 연동되어 있습니다.
          </p>
        </div>

        <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
          <button
            type="button"
            onClick={() =>
              setViewMode(
                "TABLE"
              )
            }
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode ===
              "TABLE"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 테이블 뷰
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                "KANBAN"
              )
            }
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode ===
              "KANBAN"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📊 칸반 보드 뷰
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        {viewMode ===
        "TABLE" ? (
          <ApplicationTable
            applications={
              applications
            }
            onSelectApplication={
              handleSelectApplication
            }
            onStageChange={(
              id,
              stage
            ) =>
              handleStageChange(
                id,
                stage
              )
            }
          />
        ) : (
          <ApplicationKanban
            applications={
              applications
            }
            onStageChange={(
              id,
              stage
            ) =>
              handleStageChange(
                id,
                stage
              )
            }
            onSelectApplication={
              handleSelectApplication
            }
          />
        )}
      </div>

      <ApplicationSlideOver
        isOpen={
          isSlideOverOpen
        }
        onClose={
          handleCloseSlideOver
        }
        selectedApp={
          selectedApp
        }
        candidateProfile={
          candidateProfile
        }
        profileLoading={
          profileLoading
        }
        otherApplications={
          otherApplications
        }
        onStageChange={
          handleStageChange
        }
      />
    </div>
  );
}