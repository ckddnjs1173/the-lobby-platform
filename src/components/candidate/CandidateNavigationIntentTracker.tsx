"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { rememberCandidateReturnPath } from "../../lib/candidateNavigationIntent";

export default function CandidateNavigationIntentTracker() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (
      pathname === "/login" &&
      previousPath?.startsWith("/jobs")
    ) {
      rememberCandidateReturnPath(previousPath);
    }

    previousPathRef.current = pathname;
  }, [pathname]);

  return null;
}
