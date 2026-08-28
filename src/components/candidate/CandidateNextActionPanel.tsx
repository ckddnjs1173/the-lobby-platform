"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

import { fetchCandidatePortalApplications } from "../../lib/candidatePortalApi";
import type { CandidatePortalApplicationView } from "../../lib/candidatePortalTypes";
import { getCandidateNextAction } from "../../lib/candidateNextAction";
import { auth } from "../../lib/firebase";

export default function CandidateNextActionPanel() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [applications, setApplications] = useState<CandidatePortalApplicationView[]>([]);

  useEffect(() => {
    if (pathname !== "/candidate") {
      setMountNode(null);
      return;
    }

    const locateTarget = () => {
      const target = document.getElementById("candidate-applications");
      if (target) setMountNode(target);
      return Boolean(target);
    };

    if (locateTarget()) return;

    const observer = new MutationObserver(() => {
      if (locateTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/candidate") return;

    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) setApplications([]);
        return;
      }

      try {
        const result = await fetchCandidatePortalApplications();
        if (!cancelled) setApplications(result);
      } catch (error) {
        console.error("Candidate next-action load failed:", error);
        if (!cancelled) setApplications([]);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pathname]);

  const orderedApplications = useMemo(
    () =>
      [...applications].sort((a, b) => {
        const aTerminal = ["HIRED", "REJECTED", "CANCELED"].includes(a.stage) ? 1 : 0;
        const bTerminal = ["HIRED", "REJECTED", "CANCELED"].includes(b.stage) ? 1 : 0;
        if (aTerminal !== bTerminal) return aTerminal - bTerminal;
        const aTime = Date.parse(a.lastActivityAt || a.updatedAt || a.appliedAt || "") || 0;
        const bTime = Date.parse(b.lastActivityAt || b.updatedAt || b.appliedAt || "") || 0;
        return bTime - aTime;
      }),
    [applications]
  );

  if (pathname !== "/candidate" || !mountNode || orderedApplications.length === 0) {
    return null;
  }

  return createPortal(
    <div className="mt-5 border-t border-brand-line pt-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-bronze">Next Action</p>
          <h3 className="mt-1 text-sm font-bold text-brand-espresso">지원 건별 다음 안내</h3>
          <p className="mt-1 text-[11px] leading-5 text-brand-muted">
            현재 단계와 시스템에 등록된 일정만 기준으로 보여줍니다. 확정되지 않은 일정이나 처리 기한은 임의로 안내하지 않습니다.
          </p>
        </div>
        <Link href="/jobs" className="w-fit text-xs font-bold text-brand-bronze">
          채용공고 보기 →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {orderedApplications.map((application) => {
          const action = getCandidateNextAction(application);
          return (
            <article
              key={`next-action-${application.applicationId}`}
              className={`rounded-xl border p-4 ${
                action.terminal
                  ? "border-brand-line bg-brand-light"
                  : "border-brand-gold/30 bg-brand-ivory/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-brand-muted">{application.company}</p>
                  <Link
                    href={`/jobs/${application.jobId}`}
                    className="mt-1 block truncate text-sm font-bold text-brand-espresso hover:text-brand-bronze hover:underline"
                  >
                    {application.jobTitle}
                  </Link>
                </div>
                <span className="shrink-0 rounded-full border border-brand-line bg-white px-2.5 py-1 text-[11px] font-bold text-brand-bronze">
                  {action.label}
                </span>
              </div>

              <p className="mt-3 text-[13px] font-bold leading-5 text-brand-espresso">{action.title}</p>
              <p className="mt-1.5 break-keep text-[12px] leading-5 text-brand-muted">{action.description}</p>
              {action.detail ? (
                <div className="mt-3 rounded-lg border border-brand-line bg-white px-3 py-2.5 text-[12px] font-bold leading-5 text-brand-ink">
                  {action.detail}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>,
    mountNode
  );
}
