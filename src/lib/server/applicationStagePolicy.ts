import type {
  ApplicationStage,
} from "../../types";

export type ApplicationStageActorRole =
  | "ADMIN"
  | "RECRUITER";

export type ApplicationStageTransitionKind =
  | "STANDARD"
  | "BACKWARD_WITH_REASON"
  | "HOLD_REOPEN"
  | "ADMIN_OVERRIDE";

export interface ApplicationStageTransitionDecision {
  allowed: boolean;
  kind?: ApplicationStageTransitionKind;
  status?: number;
  code?: string;
  message?: string;
}

const PIPELINE_STAGE_ORDER:
  readonly ApplicationStage[] = [
    "NEW",
    "REVIEWING",
    "CONTACTED",
    "RECOMMEND_PENDING",
    "RECOMMENDED",
    "DOCUMENT_SCREEN",
    "INTERVIEW",
    "OFFER",
    "HIRED",
  ];

const TERMINAL_STAGES =
  new Set<ApplicationStage>([
    "HIRED",
    "REJECTED",
    "CANCELED",
  ]);

const EXCEPTION_STAGES =
  new Set<ApplicationStage>([
    "HOLD",
    "REJECTED",
    "CANCELED",
  ]);

const GUARDED_ENTRY_STAGES:
  Partial<
    Record<
      ApplicationStage,
      readonly ApplicationStage[]
    >
  > = {
    INTERVIEW: [
      "RECOMMENDED",
      "DOCUMENT_SCREEN",
    ],
    OFFER: [
      "INTERVIEW",
    ],
    HIRED: [
      "OFFER",
    ],
  };

function hasReason(
  note?: string
): boolean {
  return Boolean(
    note?.trim()
  );
}

function denied(
  code: string,
  message: string,
  status = 409
): ApplicationStageTransitionDecision {
  return {
    allowed: false,
    status,
    code,
    message,
  };
}

/**
 * Phase 6 transition policy.
 *
 * 설계 원칙:
 * - 일반적인 전진 흐름은 유연하게 유지한다.
 * - INTERVIEW / OFFER / HIRED 같은 고위험 단계는 선행 단계가 필요하다.
 * - 종료 상태를 다시 여는 작업은 ADMIN + 사유가 필요하다.
 * - 역방향 이동과 HOLD 복귀는 사유를 Audit Trail에 남긴다.
 * - ADMIN은 사유를 남긴 경우 고위험 전이를 예외 처리할 수 있다.
 */
export function evaluateApplicationStageTransition(
  fromStage: ApplicationStage,
  toStage: ApplicationStage,
  actorRole: ApplicationStageActorRole,
  note?: string
): ApplicationStageTransitionDecision {
  if (
    fromStage ===
    toStage
  ) {
    return {
      allowed: true,
      kind: "STANDARD",
    };
  }

  if (
    TERMINAL_STAGES.has(
      fromStage
    )
  ) {
    if (
      actorRole === "ADMIN" &&
      hasReason(note)
    ) {
      return {
        allowed: true,
        kind: "ADMIN_OVERRIDE",
      };
    }

    return denied(
      "TERMINAL_STAGE_REOPEN_DENIED",
      "종료된 지원 건을 다시 열려면 관리자 권한과 변경 사유가 필요합니다."
    );
  }

  if (
    fromStage === "HOLD"
  ) {
    if (
      EXCEPTION_STAGES.has(
        toStage
      )
    ) {
      return {
        allowed: true,
        kind: "STANDARD",
      };
    }

    if (
      !hasReason(note)
    ) {
      return denied(
        "STAGE_CHANGE_REASON_REQUIRED",
        "보류 상태에서 채용 절차를 재개하려면 변경 사유를 입력해주세요.",
        400
      );
    }

    return {
      allowed: true,
      kind: "HOLD_REOPEN",
    };
  }

  if (
    EXCEPTION_STAGES.has(
      toStage
    )
  ) {
    return {
      allowed: true,
      kind: "STANDARD",
    };
  }

  const guardedSources =
    GUARDED_ENTRY_STAGES[
      toStage
    ];

  if (
    guardedSources &&
    !guardedSources.includes(
      fromStage
    )
  ) {
    if (
      actorRole === "ADMIN" &&
      hasReason(note)
    ) {
      return {
        allowed: true,
        kind: "ADMIN_OVERRIDE",
      };
    }

    return denied(
      "INVALID_STAGE_TRANSITION",
      `${fromStage} 단계에서 ${toStage} 단계로 바로 이동할 수 없습니다.`
    );
  }

  const fromIndex =
    PIPELINE_STAGE_ORDER.indexOf(
      fromStage
    );

  const toIndex =
    PIPELINE_STAGE_ORDER.indexOf(
      toStage
    );

  if (
    fromIndex >= 0 &&
    toIndex >= 0 &&
    toIndex < fromIndex
  ) {
    if (
      !hasReason(note)
    ) {
      return denied(
        "STAGE_CHANGE_REASON_REQUIRED",
        "이전 단계로 되돌리려면 변경 사유를 입력해주세요.",
        400
      );
    }

    return {
      allowed: true,
      kind: "BACKWARD_WITH_REASON",
    };
  }

  return {
    allowed: true,
    kind: "STANDARD",
  };
}
