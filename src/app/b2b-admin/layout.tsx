"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../../lib/firebase";
import {
  B2BApiError,
  fetchB2BSession,
  type B2BSession,
} from "../../lib/b2bApi";
import { B2BSessionProvider } from "../../components/b2b-admin/B2BSessionContext";

function LobbyMark() {
  return (
    <div className="relative h-11 w-9 shrink-0 text-brand-bronze" aria-hidden="true">
      <span className="font-editorial absolute left-0 top-[-4px] text-[34px] leading-none">L</span>
      <span className="font-editorial absolute left-[11px] top-[8px] text-[23px] leading-none text-brand-gold">L</span>
      <span className="absolute bottom-0 left-0 h-px w-8 bg-brand-gold/45" />
    </div>
  );
}

function NavIcon({ type }: { type: "pipeline" | "candidate" | "job" | "analytics" }) {
  const common = "h-[17px] w-[17px]";

  if (type === "candidate") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.8 18c.7-3.2 2.5-4.8 5.2-4.8s4.5 1.6 5.2 4.8M16 8h5M18.5 5.5v5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "job") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <rect x="4" y="7" width="16" height="12" rx="2" />
        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" />
      </svg>
    );
  }

  if (type === "analytics") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M5 19V9M12 19V5M19 19v-7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5 6h14M5 12h14M5 18h14" strokeLinecap="round" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function B2BAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<B2BSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === "/b2b-admin/login";
  const isApplicationsPage = pathname === "/b2b-admin";
  const isCandidatesPage = pathname.startsWith("/b2b-admin/candidates");
  const isJobsPage = pathname.startsWith("/b2b-admin/jobs");
  const isAnalyticsPage = pathname.startsWith("/b2b-admin/analytics");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      setSession(null);
      return;
    }

    let cancelled = false;
    setCheckingAuth(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      if (!user) {
        setSession(null);
        setCheckingAuth(false);
        router.replace("/b2b-admin/login");
        return;
      }

      try {
        const verifiedSession = await fetchB2BSession();
        if (cancelled) return;
        setSession(verifiedSession);
        setCheckingAuth(false);
      } catch (error) {
        if (cancelled) return;

        console.error("B2B authorization error:", error);
        setSession(null);
        setCheckingAuth(false);

        if (error instanceof B2BApiError) {
          const params = new URLSearchParams();
          params.set("error", error.code);
          router.replace(`/b2b-admin/login?${params.toString()}`);
          return;
        }

        router.replace("/b2b-admin/login?error=B2B_SESSION_FAILED");
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (checkingAuth || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-light">
        <div className="rounded-xl border border-brand-line bg-white px-8 py-7 text-center shadow-card">
          <div className="font-editorial text-xl text-brand-espresso">THE LOBBY</div>
          <div className="mt-3 text-sm font-semibold text-brand-ink">관리자 권한을 확인하고 있습니다.</div>
          <div className="mt-1 text-xs text-brand-muted">인증 및 조직 권한 검증 중</div>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/b2b-admin", label: "지원자 파이프라인", caption: "Applications", icon: "pipeline" as const, active: isApplicationsPage },
    { href: "/b2b-admin/candidates", label: "후보자 CRM", caption: "Candidate Pool", icon: "candidate" as const, active: isCandidatesPage },
    { href: "/b2b-admin/jobs", label: "포지션 관리", caption: "Jobs", icon: "job" as const, active: isJobsPage },
    { href: "/b2b-admin/analytics", label: "채용 분석", caption: "Analytics", icon: "analytics" as const, active: isAnalyticsPage },
  ];

  const pageTitle = isCandidatesPage
    ? "후보자 CRM"
    : isJobsPage
      ? "포지션 관리"
      : isAnalyticsPage
        ? "채용 분석"
        : "지원자 파이프라인";

  const pageCaption = isCandidatesPage
    ? "인재 프로필과 지원 이력을 한 곳에서 관리합니다."
    : isJobsPage
      ? "채용 포지션을 등록하고 공개 상태를 운영합니다."
      : isAnalyticsPage
        ? "채용 퍼널과 운영 지표를 데이터로 확인합니다."
        : "지원자 진행 상황을 빠르게 파악하고 다음 액션을 관리합니다.";

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut(auth);
    router.replace("/b2b-admin/login");
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={`${mobile ? "mobile-" : ""}${item.href}`}
          href={item.href}
          onClick={() => mobile && setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-3 transition ${
            item.active
              ? "bg-brand-bronze text-white shadow-card"
              : "text-brand-ink/75 hover:bg-white hover:text-brand-bronze"
          }`}
        >
          <NavIcon type={item.icon} />
          <div className="min-w-0">
            <div className="text-[13px] font-bold">{item.label}</div>
            <div className={`mt-0.5 truncate text-[9px] ${item.active ? "text-white/65" : "text-brand-muted"}`}>{item.caption}</div>
          </div>
        </Link>
      ))}
    </>
  );

  return (
    <B2BSessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-brand-ivory text-brand-ink">
        <aside className="hidden w-[230px] shrink-0 flex-col border-r border-brand-line bg-brand-light lg:flex">
          <div className="flex h-[88px] items-center gap-3 border-b border-brand-line px-5">
            <LobbyMark />
            <div className="leading-none">
              <div className="font-editorial text-[19px] tracking-[0.08em] text-brand-espresso">THE LOBBY</div>
              <div className="mt-1 text-[7px] font-semibold uppercase tracking-[0.16em] text-brand-muted">Recruiting Operating System</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 px-3 py-6">
            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-brand-muted">Workspace</p>
            <NavLinks />
            <div className="my-5 border-t border-brand-line" />
            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-brand-muted">Quick Action</p>
            <Link href="/b2b-admin/candidates/new" className="flex items-center justify-between rounded-lg border border-brand-gold/30 bg-white px-3 py-3 text-[12px] font-bold text-brand-bronze transition hover:shadow-card">
              신규 후보자 등록 <span aria-hidden="true">＋</span>
            </Link>
          </nav>

          <div className="border-t border-brand-line p-3">
            <div className="rounded-xl border border-brand-line bg-white p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ivory text-xs font-bold text-brand-bronze">{session.name.slice(0, 1)}</div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-brand-espresso">{session.name}</div>
                  <div className="mt-0.5 truncate text-[9px] text-brand-muted">{session.role} · {session.organizationId || "전체 조직"}</div>
                </div>
              </div>
              <button type="button" onClick={() => void handleSignOut()} className="mt-3 w-full rounded-lg border border-brand-line px-3 py-2 text-[10px] font-semibold text-brand-muted hover:bg-brand-ivory">로그아웃</button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="relative flex min-h-[88px] shrink-0 items-center justify-between gap-4 border-b border-brand-line bg-brand-light/95 px-4 backdrop-blur sm:px-7 lg:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-brand-bronze">J&C Recruiting OS <span className="h-px w-5 bg-brand-gold/45" /></div>
              <h1 className="font-editorial mt-1 truncate text-[22px] tracking-[-0.04em] text-brand-espresso sm:text-[24px]">{pageTitle}</h1>
              <p className="mt-0.5 hidden text-[10px] text-brand-muted sm:block">{pageCaption}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden rounded-lg border border-brand-line bg-white px-4 py-2.5 text-[10px] font-semibold text-brand-espresso shadow-card sm:block">
                {session.name}<span className="ml-2 text-brand-muted">{session.role}</span>
              </div>
              <button
                type="button"
                aria-label={mobileOpen ? "관리자 메뉴 닫기" : "관리자 메뉴 열기"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-espresso lg:hidden"
              >
                <span aria-hidden="true" className="text-lg leading-none">{mobileOpen ? "×" : "☰"}</span>
              </button>
            </div>

            {mobileOpen ? (
              <div className="absolute left-0 right-0 top-full z-40 border-b border-brand-line bg-brand-light p-4 shadow-soft lg:hidden">
                <div className="mb-3 rounded-lg border border-brand-line bg-white p-3 text-xs">
                  <div className="font-bold text-brand-espresso">{session.name}</div>
                  <div className="mt-1 text-[10px] text-brand-muted">{session.role} · {session.organizationId || "전체 조직"}</div>
                </div>
                <nav className="space-y-1"><NavLinks mobile /></nav>
                <Link href="/b2b-admin/candidates/new" onClick={() => setMobileOpen(false)} className="mt-3 flex items-center justify-between rounded-lg border border-brand-gold/30 bg-white px-3 py-3 text-xs font-bold text-brand-bronze">신규 후보자 등록 <span>＋</span></Link>
                <button type="button" onClick={() => void handleSignOut()} className="mt-3 w-full rounded-lg bg-brand-espresso px-3 py-3 text-xs font-bold text-white">로그아웃</button>
              </div>
            ) : null}
          </header>

          <main className="b2b-workspace flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
            <div className="mx-auto max-w-[1560px]">{children}</div>
          </main>
        </div>
      </div>
    </B2BSessionProvider>
  );
}
