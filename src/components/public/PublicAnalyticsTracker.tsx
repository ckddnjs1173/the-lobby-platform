"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackPublicEvent } from "../../lib/publicEventApi";

export default function PublicAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/b2b-admin")) return;
    void trackPublicEvent("page_view");
  }, [pathname]);

  return null;
}
