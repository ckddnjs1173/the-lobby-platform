"use client";

import {
  ApplicationStage,
  ApplicationView,
} from "../../types";

interface ApplicationTableProps {
  applications: ApplicationView[];

  onSelectApplication: (
    application: ApplicationView
  ) => void;

  onStageChange: (
    applicationId: string,
    newStage: ApplicationStage
  ) => void;
}

const STAGE_LABELS: Record<
  ApplicationStage,
  string
> = {
  NEW: "신규지원",
  REVIEWING: "검토중",
  CONTACTED: "연락완료",
  RECOMMEND_PENDING: "추천예정",
  RECOMMENDED: "추천완료",
  DOCUMENT_SCREEN: "서류전형",
  INTERVIEW: "면접진행",
  OFFER: "처우협의",
  HIRED: "합격입사",
  HOLD: "보류",
  REJECTED: "불합격",
  CANCELED: "지원취소",
};

function formatAppliedDate(
  isoDate: string
): string {
  if (!isoDate) {
    return "-";
  }

  const parsedDate = new Date(isoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ApplicationTable({
  applications,
  onSelectApplication,
  onStageChange,
}: ApplicationTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-4 px-6">
                지원자 정보
              </th>

              <th className="py-4 px-6">
                지원 공고 / 기업
              </th>

              <th className="py-4 px-6">
                현재 단계
              </th>

              <th className="py-4 px-6">
                지원 일시
              </th>

              <th className="py-4 px-6 text-right">
                관리
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {applications.length > 0 ? (
              applications.map(
                (application) => (
                  <tr
                    key={
                      application.applicationId
                    }
                    onClick={() =>
                      onSelectApplication(
                        application
                      )
                    }
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Candidate */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 group-hover:text-brand-navy transition-colors">
                        {
                          application.candidateName
                        }
                      </div>

                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {
                          application.candidatePhone
                        }{" "}
                        |{" "}
                        {
                          application.candidateEmail
                        }
                      </div>
                    </td>

                    {/* Job */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">
                        {application.jobTitle}
                      </div>

                      <div className="text-xs text-brand-navy font-medium mt-0.5">
                        {application.company}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {
                          STAGE_LABELS[
                            application.stage
                          ]
                        }
                      </span>
                    </td>

                    {/* Applied At */}
                    <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                      {formatAppliedDate(
                        application.appliedAt
                      )}
                    </td>

                    {/* Action */}
                    <td
                      className="py-4 px-6 text-right"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <select
                        value={
                          application.stage
                        }
                        onChange={(event) =>
                          onStageChange(
                            application.applicationId,
                            event.target
                              .value as ApplicationStage
                          )
                        }
                        className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                      >
                        {Object.entries(
                          STAGE_LABELS
                        ).map(
                          ([stage, label]) => (
                            <option
                              key={stage}
                              value={stage}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                  </tr>
                )
              )
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="py-16 text-center text-slate-400 font-medium"
                >
                  등록된 지원 내역이
                  없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}