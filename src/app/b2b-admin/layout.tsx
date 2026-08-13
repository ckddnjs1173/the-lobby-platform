"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
} from "../../lib/firebase";

import {
  B2BApiError,
  fetchB2BSession,
  type B2BSession,
} from "../../lib/b2bApi";

import {
  B2BSessionProvider,
} from "../../components/b2b-admin/B2BSessionContext";

export default function B2BAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const [
    session,
    setSession,
  ] =
    useState<B2BSession | null>(
      null
    );

  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);

  /**
   * 로그인 페이지는 B2B Session Provider 없이
   * 독립적으로 렌더링한다.
   */
  const isLoginPage =
    pathname ===
    "/b2b-admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(
        false
      );

      setSession(
        null
      );

      return;
    }

    let cancelled =
      false;

    setCheckingAuth(true);

    const unsubscribe =
      onAuthStateChanged(
        auth,

        async (user) => {
          if (cancelled) {
            return;
          }

          if (!user) {
            setSession(
              null
            );

            setCheckingAuth(
              false
            );

            router.replace(
              "/b2b-admin/login"
            );

            return;
          }

          try {
            /**
             * 단순 Firebase 로그인 여부가 아니라
             * Server API에서 실제 Role / Tenant를 검증한다.
             */
            const verifiedSession =
              await fetchB2BSession();

            if (cancelled) {
              return;
            }

            setSession(
              verifiedSession
            );

            setCheckingAuth(
              false
            );
          } catch (error) {
            if (cancelled) {
              return;
            }

            console.error(
              "B2B authorization error:",
              error
            );

            setSession(
              null
            );

            setCheckingAuth(
              false
            );

            if (
              error instanceof
              B2BApiError
            ) {
              const params =
                new URLSearchParams();

              params.set(
                "error",
                error.code
              );

              router.replace(
                `/b2b-admin/login?${params.toString()}`
              );

              return;
            }

            router.replace(
              "/b2b-admin/login?error=B2B_SESSION_FAILED"
            );
          }
        }
      );

    return () => {
      cancelled = true;

      unsubscribe();
    };
  }, [
    isLoginPage,
    router,
  ]);

  // ==========================================================================
  // Login Page
  // ==========================================================================

  if (isLoginPage) {
    return <>{children}</>;
  }

  // ==========================================================================
  // Authorization Loading
  // ==========================================================================

  if (
    checkingAuth ||
    !session
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-sm font-semibold text-slate-600">
            관리자 권한을 확인하고
            있습니다...
          </div>

          <div className="text-xs text-slate-400">
            Firebase 인증 및 조직
            권한 검증 중
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Authorized Workspace
  // ==========================================================================

  return (
    <B2BSessionProvider
      session={session}
    >
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <span className="text-lg font-bold text-brand-gold tracking-wider">
              J&C BACKOFFICE
            </span>
          </div>

          <nav className="flex-1 py-4 space-y-1">
            <a
              href="/b2b-admin"
              className="block px-6 py-2 bg-slate-800 text-white font-medium border-l-4 border-brand-gold"
            >
              지원자 관리
            </a>

            <a
              href="#"
              className="block px-6 py-2 hover:bg-slate-800 hover:text-white transition-colors"
            >
              공고 관리 (준비중)
            </a>
          </nav>

          {/* Current User */}
          <div className="p-4 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 truncate">
              {session.name}
            </div>

            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {session.email}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold text-brand-gold">
                {session.role}
              </span>

              {session.organizationId && (
                <span className="text-[10px] text-slate-500 truncate">
                  {
                    session.organizationId
                  }
                </span>
              )}
            </div>

            <div className="text-[10px] text-slate-600 mt-3">
              © 2026 The Lobby by
              J&C.
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </B2BSessionProvider>
  );
}