"use client";

export async function trackPublicEvent(eventName: "page_view"): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/public/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        path: window.location.pathname,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics must never block the user flow.
  }
}
