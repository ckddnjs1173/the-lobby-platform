import type { CandidatePortalApplicationView } from "./candidatePortalTypes";

export interface CandidateNextAction {
  label: string;
  title: string;
  description: string;
  detail: string | null;
  terminal: boolean;
}

const METHOD_LABELS = {
  ONSITE: "대면 면접",
  VIDEO: "화상 면접",
  PHONE: "전화 면접",
} as const;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getCandidateNextAction(
  application: CandidatePortalApplicationView
): CandidateNextAction {
  const stage = application.stage;

  if (stage === "INTERVIEW") {
    const interview = application.nextInterview;
    return {
      label: "면접 안내",
      title: interview ? "확정된 면접 일정을 확인해주세요." : "면접 일정 확정을 기다리는 단계입니다.",
      description: interview
        ? "일정·방식·장소를 다시 확인하고 변경 안내가 있는지 Candidate Portal에서 확인해주세요."
        : "면접 일정이 등록되면 Candidate Portal에 표시됩니다.",
      detail: interview
        ? [
            formatDateTime(interview.scheduledAt),
            METHOD_LABELS[interview.method],
            interview.location || null,
          ]
            .filter(Boolean)
            .join(" · ")
        : null,
      terminal: false,
    };
  }

  if (stage === "HIRED") {
    return {
      label: "입사 안내",
      title: application.plannedStartDate ? "입사 예정일을 확인해주세요." : "입사 관련 안내를 확인해주세요.",
      description: "채용이 확정된 지원 건입니다. 담당자가 전달한 입사 준비사항을 함께 확인해주세요.",
      detail: application.plannedStartDate
        ? `입사 예정 ${formatDate(application.plannedStartDate)}`
        : null,
      terminal: true,
    };
  }

  const copy: Record<
    Exclude<CandidatePortalApplicationView["stage"], "INTERVIEW" | "HIRED">,
    CandidateNextAction
  > = {
    NEW: {
      label: "다음 안내",
      title: "지원 접수가 완료되었습니다.",
      description: "담당자가 지원 내용을 확인하는 단계입니다. 추가 요청이 있을 때 안내 내용을 확인해주세요.",
      detail: null,
      terminal: false,
    },
    REVIEWING: {
      label: "다음 안내",
      title: "담당자 검토가 진행 중입니다.",
      description: "검토 결과 또는 추가 확인 요청이 Candidate Portal 상태에 반영되는지 확인해주세요.",
      detail: null,
      terminal: false,
    },
    CONTACTED: {
      label: "다음 안내",
      title: "담당자 연락 이후의 안내를 확인해주세요.",
      description: "통화·메시지로 협의한 다음 절차와 Portal의 진행 상태를 함께 확인해주세요.",
      detail: null,
      terminal: false,
    },
    RECOMMEND_PENDING: {
      label: "다음 안내",
      title: "고객사 추천 전 내부 검토 단계입니다.",
      description: "프로필과 포지션 적합성 검토가 진행 중이며, 다음 단계가 확정되면 상태가 변경됩니다.",
      detail: null,
      terminal: false,
    },
    RECOMMENDED: {
      label: "다음 안내",
      title: "고객사 검토 결과를 확인하는 단계입니다.",
      description: "고객사에 프로필이 전달된 상태입니다. 다음 전형으로 이동하면 Portal 상태가 변경됩니다.",
      detail: null,
      terminal: false,
    },
    DOCUMENT_SCREEN: {
      label: "다음 안내",
      title: "고객사 서류 검토가 진행 중입니다.",
      description: "면접 또는 다음 전형으로 이동하는지 Candidate Portal에서 확인해주세요.",
      detail: null,
      terminal: false,
    },
    OFFER: {
      label: "조건 협의",
      title: "채용 조건 협의가 진행 중입니다.",
      description: "담당자가 전달한 근무조건과 입사 관련 안내를 확인해주세요.",
      detail: null,
      terminal: false,
    },
    HOLD: {
      label: "진행 보류",
      title: "현재 채용 절차가 보류된 상태입니다.",
      description: "진행이 재개되거나 종료되면 Candidate Portal의 상태가 변경됩니다.",
      detail: null,
      terminal: false,
    },
    REJECTED: {
      label: "전형 종료",
      title: "이번 채용 절차가 종료되었습니다.",
      description: "다른 공개 포지션과 인재풀 설정을 통해 다음 기회를 계속 확인할 수 있습니다.",
      detail: null,
      terminal: true,
    },
    CANCELED: {
      label: "지원 취소",
      title: "지원 취소가 반영되었습니다.",
      description: "이 지원 건은 더 이상 진행되지 않습니다.",
      detail: null,
      terminal: true,
    },
  };

  return copy[stage];
}
