"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function B2BAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 로그인 상태 감지
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        // 로그인 페이지가 아닐 때만 튕겨내기 (무한 루프 방지)
        if (pathname !== "/b2b-admin/login") {
          router.push("/b2b-admin/login");
        }
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // 로그인 페이지일 때는 사이드바 없이 로그인 창만 보여줌
  if (pathname === "/b2b-admin/login") {
    return <>{children}</>;
  }

  // 로그인이 안 된 상태에서 대시보드 진입 시도시 흰 화면 처리 (깜빡임 방지)
  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">인증 확인 중...</div>;
  }

  // 로그인 성공 시 정상적인 대시보드 레이아웃 렌더링
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-lg font-bold text-brand-gold tracking-wider">J&C BACKOFFICE</span>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          <a href="/b2b-admin" className="block px-6 py-2 bg-slate-800 text-white font-medium border-l-4 border-brand-gold">지원자 관리</a>
          <a href="#" className="block px-6 py-2 hover:bg-slate-800 hover:text-white transition-colors">공고 관리 (준비중)</a>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          © 2026 The Lobby by J&C.
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}